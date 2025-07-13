const fetch = require("node-fetch");
const Owner = require("../models/Owner");

exports.connectInstance = async (req, res) => {
  const userId = req.body.ownerId;

  try {
    const owner = await Owner.findById(userId);
    console.log("[connectInstance] Owner encontrado:", owner);
    if (!owner?.phone) {
      console.log("[connectInstance] Telefone não encontrado para o owner");
      return res.status(404).json({ error: "Telefone não encontrado." });
    }

    const instanceName = owner.phone.replace(/\D/g, "");
    console.log("[connectInstance] instanceName:", instanceName);

    const statusRes = await fetch(
      `http://localhost:8080/instance/connectionState/${instanceName}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          apikey: "odLscVS5lhvKOQ2fTm05xy8EwEd8G8Fx",
        },
      }
    );

    const statusData = await statusRes.json();
    console.log("[connectInstance] statusData:", statusData);
    const state = statusData?.instance?.state;

    if (state === "open") {
      await Owner.findByIdAndUpdate(userId, { whatsappConnection: true });
      console.log("[connectInstance] Instância já conectada");
      return res.status(200).json({
        message: "Instância já conectada.",
        state,
      });
    }
    const connectRes = await fetch(
      `http://localhost:8080/instance/connect/${instanceName}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          apikey: "odLscVS5lhvKOQ2fTm05xy8EwEd8G8Fx",
        },
      }
    );
    const connectData = await connectRes.json();
    console.log("[connectInstance] connectData:", connectData);
    return res.status(200).json({
      message: "Instância iniciando processo de conexão.",
      connectData,
    });
  } catch (err) {
    console.error("[connectInstance] Erro:", err);
    return res.status(500).json({ error: "Erro ao conectar instância." });
  }
};

exports.createInstance = async (req, res) => {
  const userId = req.body.ownerId;
  const io = req.app.get("socketio");
  try {
    const owner = await Owner.findById(userId);
    console.log("[createInstance] Owner encontrado:", owner);
    if (!owner.phone) {
      console.log("[createInstance] Telefone do proprietário não encontrado.");
      return res
        .status(404)
        .json({ error: "Telefone do proprietário não encontrado." });
    }

    const instanceName = owner.phone.replace(/\D/g, "");
    console.log("[createInstance] instanceName:", instanceName);

    const response = await fetch(`http://localhost:8080/instance/create`, {
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
          url: "http://host.docker.internal:3000/api/evolution/webhook/receive",
          webhookByEvents: true,
          webhookBase64: true,
          events: ["CONNECTION_UPDATE", "QRCODE_UPDATED"],
        },
      }),
    });

    const data = await response.json();
    console.log("[createInstance] Resposta da Evolution API:", data);

    if (data.webhook?.enabled !== true) {
      console.log("[createInstance] Webhook não estava habilitado, habilitando agora...");
      await fetch(`http:localhost:8080/webhook/set/${instanceName}`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          apikey: "odLscVS5lhvKOQ2fTm05xy8EwEd8G8Fx",
        },
        body: JSON.stringify({
          enabled: true,
          webhook: {
            url: "http://host.docker.internal:3000/api/evolution/webhook/receive",
            webhookByEvents: true,
            webhookBase64: true,
            events: ["CONNECTION_UPDATE", "QRCODE_UPDATED"],
          },
        }),
      });
    }

    if (data.qrcode) {
      console.log("[createInstance] Emitindo whatsapp_qrcode via websocket:", {
        instance: instanceName,
        qrcode: data.qrcode,
      });
      io.emit("whatsapp_qrcode", {
        instance: instanceName,
        qrcode: typeof data.qrcode === "string" ? { base64: data.qrcode } : data.qrcode,
      });
    } else {
      console.log("[createInstance] Nenhum QR Code recebido na resposta.");
    }

    return res.status(200).json(data);
  } catch (error) {
    console.error("[createInstance] Erro:", error);
    return res.status(500).json({ error: "Erro ao criar instância" });
  }
};
exports.consultInstance = async (req, res) => {
  const userId = req.body.ownerId;

  try {
    const owner = await Owner.findById(userId);
    console.log("[consultInstance] Owner encontrado:", owner);
    if (!owner?.phone) {
      console.log("[consultInstance] Telefone não encontrado para o owner");
      return res.status(404).json({ error: "Telefone não encontrado." });
    }

    const instanceName = owner.phone.replace(/\D/g, "");
    console.log("[consultInstance] instanceName:", instanceName);

    const statusRes = await fetch(
      `http://localhost:8080/instance/connectionState/${instanceName}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          apikey: "odLscVS5lhvKOQ2fTm05xy8EwEd8G8Fx",
        },
      }
    );

    const statusData = await statusRes.json();
    console.log("[consultInstance] statusData:", statusData);

    // Se status 404 OU não existe instance, CRIAR a instância!
    if (statusData?.status === 404 || !statusData?.instance) {
      console.log("[consultInstance] Instância não encontrada, criando nova...");

      // Cria a instância igual ao seu método createInstance
      const response = await fetch(`http://localhost:8080/instance/create`, {
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
            url: "http://host.docker.internal:3000/api/evolution/webhook/receive",
            webhookByEvents: true,
            webhookBase64: true,
            events: ["CONNECTION_UPDATE", "QRCODE_UPDATED"],
          },
        }),
      });
      const data = await response.json();
      return res.status(200).json({
        state: data.state,
        instance: data.instance,
        connectData: data,
      });
    }

    // Se existe, retorna o status normal
    const state = statusData?.instance?.state;
    return res.status(200).json({
      state,
      instance: statusData.instance,
      connectData: statusData,
    });

  } catch (err) {
    console.error("[consultInstance] Erro:", err);
    return res.status(500).json({ error: "Erro ao consultar instância." });
  }
};


// NO CONTROLLER webhookReceiver:
exports.webhookReceiver = async (req, res) => {
  const io = req.app.get("socketio"); // <- Pega o io já setado no app
  const data = req.body;

  console.log("[webhookReceiver] Dados recebidos:", data);

  if (
    data?.event === "connection.update"// cobre os dois formatos
  ) {
    const instance = data.instance || data.data?.instance;
    const status = data.state || data.data?.state;

    io.emit("whatsapp_connection_status", {
      instance,
      status,
      qrcode: data.qrcode ? { base64: data.qrcode } : null,
    });
    console.log("[webhookReceiver] Emitido via WebSocket:", {
      instance,
      status,
    });
  }

  return res.sendStatus(200);
};



