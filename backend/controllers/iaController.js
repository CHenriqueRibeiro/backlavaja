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

    const obterNomeDoServico = async (serviceId) => {
      const servico = await Service.findById(serviceId);
      return servico ? servico.name : `Serviço ID: ${serviceId}`;
    };

    const listaProdutos = await Promise.all(
      produtos.map(async (prod) => {
        const quantidadeAtualConvertida = Number(
          converterParaML(prod.quantidadeAtual, prod.unidade || "mL")
        ).toFixed(2);

        const servicosVinculados = await Promise.all(
          prod.servicos.map(async (vinculo) => {
            const nomeServico = await obterNomeDoServico(vinculo.service);

            const consumoPorExecucao = converterParaML(
              vinculo.consumoPorServico,
              vinculo.unidadeConsumo
            );

            const previsaoTermino =
              consumoPorExecucao > 0
                ? Math.floor(quantidadeAtualConvertida / consumoPorExecucao)
                : "Indefinido";

            return `
🔧 Serviço: ${nomeServico}
- Consumo médio por execução: ${consumoPorExecucao} ml
- Previsão de término: ${previsaoTermino} lavagens/execuções`;
          })
        );

        return `
🧴 Produto: ${prod.name}
- Quantidade atual: ${quantidadeAtualConvertida} ml
${servicosVinculados.join("\n")}`;
      })
    );

    const prompt = `
Relatório de Estoque - ${hoje.toLocaleDateString()}

${listaProdutos.join("\n\n")}

Com base nesses dados, gere um resumo com os seguintes blocos:
1. Produto Crítico: (se houver)
2. Produto com Estoque Não Crítico: (se houver)
3. Ação recomendada: (sempre colocar)

Padronize sempre nesse formato. Para cada produto, exiba:
- Nome do produto
- Quantidade atual (em ml)
- Lista dos serviços vinculados com:
  - Nome do serviço
  - Consumo médio por execução
  - Previsão de término (em número de lavagens)

Se algum produto não tiver serviço vinculado, informe: "Sem serviços vinculados". 

Se algum produto não tiver consumo médio, informe como "Indefinido".

Seja objetivo, organizado, sem repetições e sem texto redundante.
`;

    const resposta = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1",
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

    let perguntaBreakEven = "";
    if (receitaTotal < custoTotal) {
      perguntaBreakEven = `2. Quantos serviços de cada tipo seriam necessários para cobrir os custos (break-even)?`;
    }

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
${perguntaBreakEven}
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
          model: "gpt-4.1",
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

exports.clientesMaisFrequentes = async (req, res) => {
  try {
    const { establishmentId } = req.params;

    const hoje = new Date();
    const primeiroDiaDoMes = new Date(hoje.getFullYear(), hoje.getMonth(), 1);

    const agendamentos = await Appointment.find({
      establishment: establishmentId,
      status: "Entregue",
      date: {
        $gte: primeiroDiaDoMes.toISOString().split("T")[0],
        $lte: hoje.toISOString().split("T")[0],
      },
    });

    if (agendamentos.length === 0) {
      return res.status(200).json({
        resposta:
          "Nenhum agendamento entregue neste período. Não é possível gerar o relatório.",
      });
    }

    const clientes = {};

    for (const a of agendamentos) {
      const chave = a.clientPhone.trim();
      const nome = a.clientName.trim();

      if (!clientes[chave]) {
        clientes[chave] = {
          nome,
          telefone: chave,
          veiculo: a.veiculo,
          servicos: {},
          totalGasto: 0,
        };
      }

      if (!clientes[chave].servicos[a.serviceName]) {
        clientes[chave].servicos[a.serviceName] = [];
      }

      clientes[chave].servicos[a.serviceName].push({
        horario: a.startTime,
        preco: a.price,
      });

      clientes[chave].totalGasto += a.price;
    }

    const topClientes = Object.values(clientes)
      .filter((c) => Object.keys(c.servicos).length > 0)
      .map((c) => {
        const servicoMaisFeito = Object.entries(c.servicos).sort(
          (a, b) => b[1].length - a[1].length
        )[0];

        const [nomeServico, registros] = servicoMaisFeito;
        const mediaPreco = (
          registros.reduce((sum, r) => sum + r.preco, 0) / registros.length
        ).toFixed(2);
        const horarios = registros.map((r) => r.horario);

        const horarioMaisComum = [...new Set(horarios)].sort(
          (a, b) =>
            horarios.filter((h) => h === b).length -
            horarios.filter((h) => h === a).length
        )[0];

        return {
          nome: c.nome,
          telefone: c.telefone,
          veiculo: c.veiculo,
          servico: nomeServico,
          vezes: registros.length,
          precoMedio: mediaPreco,
          horarioMaisComum,
          totalGasto: c.totalGasto,
        };
      })
      .sort((a, b) => b.vezes - a.vezes || b.totalGasto - a.totalGasto)
      .slice(0, 5);

    if (topClientes.length === 0) {
      return res.status(200).json({
        resposta:
          "Nenhum cliente com dados suficientes para análise neste período.",
      });
    }

    const listaFormatada = topClientes
      .map((c, i) => {
        return `Cliente ${i + 1}:
- Nome: ${c.nome}
- Telefone: ${c.telefone}
- Veículo: ${c.veiculo}
- Serviço mais feito: ${c.servico} (${c.vezes}x)
- Horário mais comum: ${c.horarioMaisComum}
- Valor médio por serviço: R$ ${c.precoMedio}`;
      })
      .join("\n\n");

    const prompt = `Hoje é ${hoje.toLocaleDateString()}
Clientes mais frequentes do mês atual até hoje:

${listaFormatada}

Com base nos dados acima, para cada cliente individualmente, gere uma sugestão de benefício ou programa de fidelização personalizado. A resposta deve manter o mesmo formato de lista, com os dados do cliente primeiro, e a sugestão logo abaixo.`;

    const respostaIA = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${process.env.OPENAI_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4.1",
          messages: [{ role: "user", content: prompt }],
        }),
      }
    );

    const resultado = await respostaIA.json();
    const mensagemIA = resultado.choices?.[0]?.message?.content;

    res.status(200).json({ resposta: mensagemIA });
  } catch (err) {
    console.error("Erro na análise de clientes frequentes:", err);
    res
      .status(500)
      .json({ message: "Erro ao processar dados de clientes frequentes." });
  }
};

exports.precificacaoComIA = async (req, res) => {
  try {
    const { establishmentId } = req.params;
    const { margemLucro = 0 } = req.body;

    if (!establishmentId) {
      return res.status(400).json({ message: "EstablishmentId é obrigatório." });
    }

    const estabelecimento = await Establishment.findById(establishmentId).lean();
    if (!estabelecimento) {
      return res.status(404).json({ message: "Estabelecimento não encontrado." });
    }

    const diasFuncionamento = estabelecimento.workingDays;
    const horario = estabelecimento.openingHours;

    if (!diasFuncionamento || diasFuncionamento.length === 0 || !horario) {
      return res.status(400).json({
        message: "O estabelecimento precisa ter dias de funcionamento e horários cadastrados para calcular a precificação.",
      });
    }

    const { open, close, hasLunchBreak, intervalOpen, intervalClose } = horario;

    if (!open || !close) {
      return res.status(400).json({
        message: "Horário de abertura e fechamento do estabelecimento não estão completos.",
      });
    }

    function calcularHorasTrabalhadasPorDia() {
      const [horaAbertura, minAbertura] = open.split(":").map(Number);
      const [horaFechamento, minFechamento] = close.split(":").map(Number);
      let totalMinutos = (horaFechamento * 60 + minFechamento) - (horaAbertura * 60 + minAbertura);

      if (hasLunchBreak && intervalOpen && intervalClose) {
        const [hIntStart, mIntStart] = intervalOpen.split(":").map(Number);
        const [hIntEnd, mIntEnd] = intervalClose.split(":").map(Number);
        const intervaloMinutos = (hIntEnd * 60 + mIntEnd) - (hIntStart * 60 + mIntStart);
        totalMinutos -= intervaloMinutos;
      }

      return totalMinutos / 60;
    }

    const horasPorDia = calcularHorasTrabalhadasPorDia();
    const diasUteis = diasFuncionamento.length * 4;
    const horasMensais = horasPorDia * diasUteis;

    const custosFixos = await Cost.find({ establishment: establishmentId });
    const custoFixoTotal = custosFixos.reduce((acc, c) => acc + (Number(c.value) || 0), 0);

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

    const custoTotal = custoFixoTotal + custoProdutosTotal;
    const custoPorHora = horasMensais > 0 ? custoTotal / horasMensais : 0;
    const precoHoraComLucro = custoPorHora * (1 + margemLucro / 100);
    const faturamentoNecessario = precoHoraComLucro * horasMensais;

    const servicos = await Service.find({ establishment: establishmentId });
    const analiseServicosTexto = servicos.map((s) => {
     const duracaoHoras = Math.max(s.duration / 60, 0.01);
const precoHoraAtual = s.price / duracaoHoras;


      return `${s.name}
- Valor atual: R$ ${s.price.toFixed(2)}
- Duração: ${s.duration} minutos
- Preço por hora atual: R$ ${precoHoraAtual.toFixed(2)}`;
    }).join("\n\n");

    const resumoFinal = `Horas disponíveis no mês: ${horasMensais.toFixed(2)} horas
Custos fixos no mês: R$ ${custoFixoTotal.toFixed(2)}
Custos variáveis no mês (produtos): R$ ${custoProdutosTotal.toFixed(2)}
Margem de lucro desejada: ${margemLucro}%

Custo por hora: R$ ${custoPorHora.toFixed(2)}
Preço por hora com margem: R$ ${precoHoraComLucro.toFixed(2)}
Faturamento necessário no mês: R$ ${faturamentoNecessario.toFixed(2)}
`;

    const prompt = `Gere uma resposta objetiva e clara para um cliente de estética automotiva.
Apresente os dados como uma simulação de precificação, explicando os valores e sugerindo ajustes se necessário.
Não use linguagem genérica, apenas organize os dados de forma amigável.

${resumoFinal}`;

    const respostaIA = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.OPENAI_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4.1",
        messages: [
          {
            role: "system",
            content: "Você é um assistente especialista em precificação para estética automotiva. Seja direto e informativo e não precisa enviar recomendações de preços, apenas os dados.",
          },
          {
            role: "user",
            content: prompt,
          },
        ],
      }),
    });

    const resultado = await respostaIA.json();
    const mensagemIA = resultado.choices?.[0]?.message?.content || resumoFinal;

    res.status(200).json({
      resposta: mensagemIA,
      resumo: {
        horasMensais: horasMensais.toFixed(2),
        custoFixos: custoFixoTotal.toFixed(2),
        custoVariaveis: custoProdutosTotal.toFixed(2),
        custoTotal: custoTotal.toFixed(2),
        custoPorHora: custoPorHora.toFixed(2),
        precoHoraComLucro: precoHoraComLucro.toFixed(2),
        faturamentoNecessario: faturamentoNecessario.toFixed(2),
        servicos: servicos.map((s) => {
          const duracaoHoras = s.duration / 60;
          return {
            nome: s.name,
            valorAtual: s.price.toFixed(2),
            duracao: s.duration,
            precoHoraAtual: (s.price / duracaoHoras).toFixed(2),
            precoHoraMargem: precoHoraComLucro.toFixed(2),
            precoFinalSugerido: (precoHoraComLucro * duracaoHoras).toFixed(2),
          };
        }),
      },
    });
  } catch (err) {
    console.error("Erro na precificação com IA:", err);
    res.status(500).json({ message: "Erro ao gerar análise de precificação com IA." });
  }
};




