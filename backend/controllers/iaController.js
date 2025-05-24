const Produto = require("../models/Product");
const Appointment = require("../models/Appointment");
const Cost = require("../models/Cost");
const Service = require("../models/Service");
const Establishment = require("../models/Establishment");
const fetch = require("node-fetch");

function converterParaML(valor, unidade) {
  switch (unidade) {
    case "L":
      return valor * 1000;
    case "mL":
      return valor;
    case "g":
      return valor;
    case "unidade":
      return valor;
    default:
      return valor;
  }
}

function ajustarHistoricoParaML(historico, unidadeProduto) {
  return historico.map((h) => {
    const quantidade =
      typeof h.quantidade === "number"
        ? h.quantidade
        : parseFloat(h.quantidade);
    const quantidadeConvertida =
      unidadeProduto === "L" ? quantidade * 1000 : quantidade;
    return { ...h, quantidade: quantidadeConvertida };
  });
}

exports.preverConsumo = async (req, res) => {
  try {
    const establishmentId = req.params.establishmentId;

    if (!establishmentId) {
      return res.status(400).json({
        error: "O parâmetro establishmentId é obrigatório.",
      });
    }

    const hoje = new Date();
    const produtos = await Produto.find({ estabelecimento: establishmentId });

    if (!produtos || produtos.length === 0) {
      return res.status(200).json({
        resposta:
          "Nenhum produto cadastrado para este estabelecimento. Não é possível realizar a análise de consumo.",
      });
    }

    const produtosComVinculo = produtos.filter(
      (prod) => Array.isArray(prod.servicos) && prod.servicos.length > 0
    );
    if (produtosComVinculo.length === 0) {
      return res.status(200).json({
        resposta:
          "Os produtos ainda não estão vinculados a nenhum serviço. Faça a atribuição antes de gerar a análise.",
      });
    }

    const produtosComHistorico = produtosComVinculo.filter(
      (prod) => prod.consumoHistorico && prod.consumoHistorico.length > 0
    );
    if (produtosComHistorico.length === 0) {
      return res.status(200).json({
        resposta:
          "Ainda não há histórico de uso suficiente para gerar a previsão. Execute ao menos um serviço com os produtos para que a JáIA possa realizar a análise.",
      });
    }

    const listaProdutos = produtos
      .map((prod) => {
        const historicoOriginal = prod.consumoHistorico || [];

        if (historicoOriginal.length === 0) {
          return `Produto: ${prod.name}, Quantidade atual: ${prod.quantidadeAtual} ${prod.unidade}, Consumo médio por serviço: 0 ml, Vai acabar em: indefinido serviços`;
        }

        const historico = ajustarHistoricoParaML(
          historicoOriginal,
          prod.unidade
        );
        const totalConsumido = historico.reduce(
          (sum, h) => sum + h.quantidade,
          0
        );
        const totalServicos = historico.length;
        const consumoPorServico = totalConsumido / totalServicos;

        const quantidadeAtualConvertida = converterParaML(
          prod.quantidadeAtual,
          prod.unidade || "mL"
        );

        const servicosRestantes =
          consumoPorServico > 0
            ? Math.floor(quantidadeAtualConvertida / consumoPorServico)
            : "indefinido";

        const quantidadeFormatada = Number.isInteger(prod.quantidadeAtual)
          ? `${prod.quantidadeAtual} ${prod.unidade}`
          : `${prod.quantidadeAtual.toFixed(1)} ${prod.unidade}`;

        const consumoFormatado = `${consumoPorServico} ml`;

        return `Produto: ${prod.name}, Quantidade atual: ${quantidadeFormatada}, Consumo médio por serviço: ${consumoFormatado}, Vai acabar em: ${servicosRestantes} serviços`;
      })
      .join("\n");

    const prompt = `
Hoje é ${hoje.toLocaleDateString()}.
Abaixo estão os dados dos produtos do estoque:

${listaProdutos}

Com base nesses dados, gere um resumo padronizado para o gestor com os seguintes blocos, sempre na mesma ordem:

1. Relatório de Estoque - DD/MM/AAAA
2. Produto Crítico: (se houver)
3. Produto com Estoque Não Crítico: (se houver)
4. Ação recomendada: (resumo final)

Para cada produto, informe:
- Quantidade atual
- Consumo médio por serviço
- Previsão de término em número de serviços
- Recomendação de reposição (se necessário)

Se algum produto não tiver histórico, deixe como "indefinido".

Siga sempre este formato.
`;

    const resposta = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [{ role: "user", content: prompt }],
      }),
    });

    const resultado = await resposta.json();
    const mensagem = resultado.choices?.[0]?.message?.content;

    res.status(200).json({ resposta: mensagem });
  } catch (err) {
    console.error("Erro na previsão com IA:", err);
    res.status(500).json({ error: "Erro ao processar previsão de consumo." });
  }
};

exports.analiseFinanceiraComServicos = async (req, res) => {
  try {
    const { establishmentId } = req.params;

    const estabelecimento = await Establishment.findById(establishmentId);
    const nomeEstabelecimento =
      estabelecimento?.nameEstablishment || "Estabelecimento";

    const agendamentos = await Appointment.find({
      establishment: establishmentId,
      status: "Entregue",
    });
    const receitaTotal = agendamentos.reduce((sum, a) => sum + a.price, 0);

    const custosManuais = await Cost.find({ establishment: establishmentId });
    const custoManualTotal = custosManuais.reduce((sum, c) => sum + c.value, 0);

    const produtos = await Produto.find({ estabelecimento: establishmentId });
    let custoProdutosTotal = 0;

    for (const produto of produtos) {
      if (produto.entradas && Array.isArray(produto.entradas)) {
        for (const entrada of produto.entradas) {
          const preco = Number(entrada.precoUnitario) || 0;
          custoProdutosTotal += preco;
        }
      }
    }

    const custoTotal = custoManualTotal + custoProdutosTotal;
    const lucroOuPrejuizo = receitaTotal - custoTotal;

    const servicos = await Service.find({ establishment: establishmentId });
    const listaServicos = servicos
      .map((s) => `- ${s.name}: R$ ${s.price.toFixed(2)}`)
      .join("\n");

    const prompt = `
Estabelecimento: ${nomeEstabelecimento}

Resumo financeiro atual:
- Receita total: R$ ${receitaTotal.toFixed(2)}
- Custo com produtos: R$ ${custoProdutosTotal.toFixed(2)}
- Custo manual: R$ ${custoManualTotal.toFixed(2)}
- Custo total: R$ ${custoTotal.toFixed(2)}
- Lucro ou prejuízo: R$ ${lucroOuPrejuizo.toFixed(2)}

Serviços cadastrados:
${listaServicos}

Com base nesses dados, responda:
1. O estabelecimento está com lucro ou prejuízo? Quanto?
2. Quantos serviços de cada tipo seriam necessários para cobrir os custos (break-even)?
3. Qual serviço tem o melhor retorno financeiro por unidade?
4. Dê recomendações objetivas ao gestor para melhorar o resultado financeiro.
Evite repetir os dados, seja direto como um consultor financeiro.
`;

    const respostaIA = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o",
          messages: [{ role: "user", content: prompt }],
        }),
      }
    );

    const resultado = await respostaIA.json();
    const mensagemIA = resultado.choices?.[0]?.message?.content;

    res.status(200).json({
      resposta: mensagemIA,
      dados: {
        receitaTotal,
        custoManualTotal,
        custoProdutosTotal,
        custoTotal,
        lucroOuPrejuizo,
      },
    });
  } catch (err) {
    console.error("Erro na análise financeira com serviços:", err);
    res.status(500).json({ message: "Erro ao realizar análise financeira." });
  }
};
