const fetch = require("node-fetch");
const mercadopago = require("mercadopago");

const mp = new mercadopago.MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

// Cria o client de pagamento
const paymentClient = new mercadopago.Payment(mp);

exports.createPayment = async (req, res) => {
  try {
    const { amount, description, payer_email } = req.body;

    if (!amount) {
      return res.status(400).json({
        message: "O campo 'amount' é obrigatório.",
      });
    }

    // Aqui usa a instância do cliente
    const result = await paymentClient.create({
      transaction_amount: Number(amount),
      description,
      payment_method_id: "pix", // ou outro
      payer: {
        email: payer_email,
      },
    });

    res.status(200).json(result);
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
