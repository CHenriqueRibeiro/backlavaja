const fetch = require("node-fetch");
const mercadopago = require("mercadopago");

const mp = new mercadopago.MercadoPagoConfig({
  accessToken: process.env.MERCADOPAGO_ACCESS_TOKEN,
});

const paymentClient = new mercadopago.Payment(mp);

const PLANS = {
  "Plano Simples": 22.45,
  "Plano Profissional": 29.95,
  "Plano Completo": 34.95,
};

exports.createPayment = async (req, res) => {
  try {
    const { plan_name, payer_email, payment_method, card_token } = req.body;

    if (!plan_name || !payer_email || !payment_method) {
      return res.status(400).json({
        error:
          "Campos obrigatórios faltando (plan_name, payer_email, payment_method).",
      });
    }

    const amount = PLANS[plan_name];
    if (!amount) {
      return res.status(400).json({
        error: "Plano inválido.",
      });
    }

    let payment;

    if (payment_method === "pix") {
      payment = await paymentClient.create({
        body: {
          transaction_amount: amount,
          description: plan_name,
          payment_method_id: "pix",
          payer: {
            email: payer_email,
          },
        },
      });

      return res.status(200).json({
        id: payment.id,
        status: payment.status,
        description: plan_name,
        qr_code: payment.point_of_interaction.transaction_data.qr_code,
        qr_code_base64:
          payment.point_of_interaction.transaction_data.qr_code_base64,
      });
    } else if (payment_method === "credit_card") {
      if (!card_token) {
        return res.status(400).json({
          error: "Token do cartão não fornecido.",
        });
      }

      payment = await paymentClient.create({
        body: {
          transaction_amount: amount,
          description: plan_name,
          payment_method_id: "visa",
          token: card_token,
          installments: installments || 1,
          issuer_id: issuer || null,
          payer: {
            email: payer_email,
          },
        },
      });

      return res.status(200).json({
        id: payment.id,
        status: payment.status,
        description: plan_name,
      });
    } else {
      return res.status(400).json({
        error: "Método de pagamento inválido.",
      });
    }
  } catch (error) {
    console.error("Erro ao criar pagamento:", error);
    res.status(500).json({ error: "Erro ao criar pagamento." });
  }
};

// Webhook
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

      res.sendStatus(200);
    } else {
      res.status(400).json({ message: "Evento não processado ou inválido." });
    }
  } catch (error) {
    console.error("Erro ao processar webhook:", error);
    res.sendStatus(500);
  }
};

exports.checkPaymentStatus = async (req, res) => {
  try {
    const { paymentId } = req.params;

    if (!paymentId) {
      return res.status(400).json({ error: "ID do pagamento não fornecido." });
    }

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
    res.status(200).json({
      id: paymentData.id,
      status: paymentData.status,
      status_detail: paymentData.status_detail,
    });
  } catch (error) {
    console.error("Erro ao verificar status do pagamento:", error);
    res.status(500).json({ error: "Erro ao verificar status do pagamento." });
  }
};
