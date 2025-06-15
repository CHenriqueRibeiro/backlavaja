// controllers/leadController.js
const fetch = require("node-fetch");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const Owner = require("../models/Owner");

require("dotenv").config();

const RDSTATION_TOKEN = process.env.RDSTATION_TOKEN;
const RDSTATION_STAGE_ID = process.env.RDSTATION_STAGE_ID;
const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_URL;

exports.createLead = async (req, res) => {
  const { name, whatsapp, email } = req.body;

  if (!name || !whatsapp || !email) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  try {
    const existingOwner = await Owner.findOne({ email });
    if (existingOwner) {
      return res.status(409).json({
        error:
          "E-mail já cadastrado. Não é possível criar outro teste com o mesmo e-mail. Por favor, faça login com sua credenciais em nosso sistema.",
      });
    }

    const payload = {
      deal: {
        deal_stage_id: RDSTATION_STAGE_ID,
        name: name,
      },
      contacts: [
        {
          name: name,
          phones: [
            {
              phone: whatsapp,
              type: "cellphone",
            },
          ],
          emails: [
            {
              email: email,
            },
          ],
        },
      ],
    };

    const response = await fetch(
      `https://crm.rdstation.com/api/v1/deals?token=${RDSTATION_TOKEN}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );

    const data = await response.json();
    if (!response.ok) {
      return res
        .status(400)
        .json({ error: data.error || "Erro ao enviar lead para RD Station." });
    }

    const senhaProvisoria = crypto.randomBytes(4).toString("hex");

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(senhaProvisoria, salt);

    const dataLimiteTeste = new Date();
    dataLimiteTeste.setDate(dataLimiteTeste.getDate() + 15);

    const owner = new Owner({
      name,
      email,
      phone: whatsapp,
      password: hashedPassword,
      isTemporaryPassword: true,
      statusConta: "teste",
      dataLimiteTeste,
      establishments: [],
    });

    await owner.save();

    const dataExpiracao = new Date();
    dataExpiracao.setDate(dataExpiracao.getDate() + 15);

    const dataFormatada = dataExpiracao.toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    await fetch(N8N_WEBHOOK_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: name,
        email: email,
        senhaProvisoria,
        dataExpiracao: dataFormatada,
        ownerId: owner._id,
        statusConta: "teste",
      }),
    });

    res.json({ success: true, data });
  } catch (error) {
    console.error("Erro ao enviar lead:", error);
    res.status(500).json({ error: "Erro interno ao enviar lead." });
  }
};
