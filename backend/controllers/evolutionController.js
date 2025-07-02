const fetch = require("node-fetch");
const Owner = require("../models/Owner");

exports.connectInstance = async (req, res) => {
  const userId = req.body.ownerId;

  try {
    const owner = await Owner.findById(userId);
    if (!owner?.phone) {
      return res.status(404).json({ error: "Telefone não encontrado." });
    }

    const instanceName = owner.phone.replace(/\D/g, "");

    const statusRes = await fetch(
      `http:localhost:8080/instance/connectionState/${instanceName}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          apikey: "odLscVS5lhvKOQ2fTm05xy8EwEd8G8Fx",
        },
      }
    );

    const statusData = await statusRes.json();
    const state = statusData?.instance?.state;

    if (state === "open") {
      await Owner.findByIdAndUpdate(userId, { whatsappConnection: true });
      return res.status(200).json({
        message: "Instância já conectada.",
        state,
      });
    }
    const connectRes = await fetch(
      `http:localhost:8080/instance/connect/${instanceName}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          apikey: "odLscVS5lhvKOQ2fTm05xy8EwEd8G8Fx",
        },
      }
    );
    const connectData = await connectRes.json();
    return res.status(200).json({
      message: "Instância iniciando processo de conexão.",
      connectData,
    });
  } catch (err) {
    return res.status(500).json({ error: "Erro ao conectar instância." });
  }
};

exports.createInstance = async (req, res) => {
  const userId = req.body.ownerId;
  const io = req.app.get("socketio");
  try {
    const owner = await Owner.findById(userId);
    if (!owner.phone) {
      return res
        .status(404)
        .json({ error: "Telefone do proprietário não encontrado." });
    }

    const instanceName = owner.phone.replace(/\D/g, "");

    const response = await fetch(`http:localhost:8080/instance/create`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: "odLscVS5lhvKOQ2fTm05xy8EwEd8G8Fx",
      },
      body: JSON.stringify({
        instanceName,
        qrcode: true,
        integration: "WHATSAPP-BAILEYS",
        webhook: {
          url: "http://localhost:5678/webhook-test/teste",
          webhookByEvents: true,
          webhookBase64: true,
          events: ["CONNECTION_UPDATE", "QRCODE_UPDATED"],
        },
      }),
    });

    const data = await response.json();

    if (data.webhook?.enabled !== true) {
      await fetch(`http:localhost:8080/webhook/set/${instanceName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: "odLscVS5lhvKOQ2fTm05xy8EwEd8G8Fx",
        },
        body: JSON.stringify({
          enabled: true,
          webhook: {
            url: "http://localhost:5678/webhook-test/teste",
            webhookByEvents: true,
            webhookBase64: true,
            events: ["CONNECTION_UPDATE", "QRCODE_UPDATED"],
          },
        }),
      });
    }

    if (data.qrcode) {
      io.emit("whatsapp_qrcode", {
        instance: instanceName,
        qrcode: data.qrcode,
      });
    }

    return res.status(200).json(data);
  } catch (error) {
    return res.status(500).json({ error: "Erro ao criar instância" });
  }
};

exports.webhookReceiver = async (req, res) => {
  const io = req.app.get("socketio");
  const data = req.body;

  if (data?.event === "CONNECTION_UPDATE") {
    const instance = data?.instance || data?.instance_key;
    const status = data?.status || "desconhecido";

    io.emit("whatsapp_connection_status", {
      instance,
      status,
      qrcode: data.qrcode || null,
    });
  }

  return res.sendStatus(200);
};
