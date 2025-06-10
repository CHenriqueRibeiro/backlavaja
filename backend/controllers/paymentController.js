const fetch = require("node-fetch");
const mercadopago = require("mercadopago");

exports.createPayment = async (req, res) => {
  try {
    const { amount, description, payer } = req.body;

    const preference = await mercadopago.preferences.create({
      items: [
        {
          title: description,
          unit_price: Number(amount),
          quantity: 1,
        },
      ],
      payer: {
        email: payer.email,
        name: payer.name,
      },
      back_urls: {
        success: "https://lavaja.app.br/sucesso",
        failure: "https://lavaja.app.br/falha",
        pending: "https://lavaja.app.br/pendente",
      },
      auto_return: "approved",
    });

    res.json({ init_point: preference.body.init_point });
  } catch (error) {
    console.error("Erro ao criar pagamento:", error);
    res.status(500).json({ error: "Erro ao criar pagamento" });
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
