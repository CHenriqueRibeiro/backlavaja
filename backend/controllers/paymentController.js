const fetch = require("node-fetch");
const mercadopago = require("mercadopago");

exports.createPayment = async (req, res) => {
  try {
    const { description, amount, payerEmail } = req.body;

    const preference = {
      items: [
        {
          title: description,
          quantity: 1,
          unit_price: parseFloat(amount),
          currency_id: "BRL",
        },
      ],
      payer: {
        email: payerEmail,
      },
      back_urls: {
        success: "https://lavaja.app.br/pagamento-sucesso",
        failure: "https://lavaja.app.br/pagamento-falha",
        pending: "https://lavaja.app.br/pagamento-pendente",
      },
      auto_return: "approved",
    };

    const response = await mercadopago.preferences.create(preference);
    console.log("💰 Preference criada:", response.body);

    res.json({ init_point: response.body.init_point });
  } catch (error) {
    console.error("Erro ao criar pagamento:", error);
    res.status(500).json({ error: "Erro ao criar pagamento." });
  }
};

exports.webhook = async (req, res) => {
  try {
    console.log("🔔 Webhook recebido:", req.body);

    const { type, data } = req.body;

    if (type === "payment" && data && data.id) {
      const paymentId = data.id;

      const response = await fetch(
        `https://api.mercadopago.com/v1/payments/${paymentId}`,
        {
          method: "GET",
          headers: {
            Authorization: `Bearer ${process.env.MERCADOPAGO_ACCESS_TOKEN}`,
          },
        }
      );

      const paymentData = await response.json();
      console.log("💰 Detalhes do pagamento:", paymentData);

      res.sendStatus(200);
    } else {
      res.status(400).json({ message: "Evento não processado ou inválido." });
    }
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    res.sendStatus(500);
  }
};
