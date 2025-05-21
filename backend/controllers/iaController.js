const Produto = require("../models/Product");
const Servico = require("../models/Service");
const Agendamento = require("../models/Appointment");
const fetch = require("node-fetch");

exports.preverConsumo = async (req, res) => {
  try {
    const establishmentId =
      req.user?.establishmentId || "6828d66a69bdf047ec2317bd";
    const hoje = new Date();

    const produtos = await Produto.find({ estabelecimento: establishmentId });

    const listaProdutos = produtos
      .map((prod) => {
        const historico = prod.consumoHistorico || [];

        if (historico.length === 0) {
          return `Produto: ${prod.name}, Quantidade atual: ${prod.quantidadeAtual}mL, Consumo médio por serviço: 0.0mL, Vai acabar em: indefinido serviços`;
        }

        const totalConsumido = historico.reduce(
          (sum, h) => sum + h.quantidade,
          0
        );
        const totalServicos = historico.length;
        const consumoPorServico = totalConsumido / totalServicos;

        const servicosRestantes =
          consumoPorServico > 0
            ? Math.floor(prod.quantidadeAtual / consumoPorServico)
            : "indefinido";

        return `Produto: ${prod.name}, Quantidade atual: ${
          prod.quantidadeAtual
        }mL, Consumo médio por serviço: ${consumoPorServico.toFixed(
          1
        )}mL, Vai acabar em: ${servicosRestantes} serviços`;
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
