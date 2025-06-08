const fetch = require("node-fetch"); // npm install node-fetch@2
require("dotenv").config();

const RDSTATION_TOKEN = process.env.RDSTATION_TOKEN;
const RDSTATION_STAGE_ID = process.env.RDSTATION_STAGE_ID;

exports.createLead = async (req, res) => {
  const { name, whatsapp, email } = req.body;

  if (!name || !whatsapp || !email) {
    return res.status(400).json({ error: "Todos os campos são obrigatórios." });
  }

  // Monta o payload do RD Station
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

  try {
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
        .json({ error: data.error || "Erro ao enviar lead" });
    }

    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: "Erro interno ao enviar lead." });
  }
};
