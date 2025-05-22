const Produto = require("../models/Product");
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
        const historico = prod.consumoHistorico || [];

        if (historico.length === 0) {
          return `Produto: ${prod.name}, Quantidade atual: ${prod.quantidadeAtual} ${prod.unidade}, Consumo médio por serviço: 0 ml, Vai acabar em: indefinido serviços`;
        }

        const totalConsumido = historico.reduce((sum, h) => {
          return sum + h.quantidade; // já está salvo em mL
        }, 0);

        const quantidadeAtualConvertida = converterParaML(
          prod.quantidadeAtual,
          prod.unidade || "mL"
        );

        const totalServicos = historico.length;
        const consumoPorServico = (totalConsumido / totalServicos) * 1000;

        const consumoFormatado = `${consumoPorServico} ml`;

        const servicosRestantes =
          consumoPorServico > 0
            ? Math.floor(quantidadeAtualConvertida / consumoPorServico)
            : "indefinido";

        const quantidadeFormatada = prod.quantidadeAtual
          ? `${prod.quantidadeAtual} ${prod.unidade}`
          : `${prod.quantidadeAtual.toFixed(1)} ${prod.unidade}`;

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
