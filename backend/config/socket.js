const fetch = require("node-fetch");
const Owner = require("../models/Owner");

let io;

module.exports = {
  setIO: (serverIO) => {
    io = serverIO;

    io.on("connection", (socket) => {
     socket.on("consult_instance", async ({ ownerId }) => {

  const owner = await Owner.findById(ownerId);
  if (!owner) {
    console.error("❌ [consult_instance] Owner não encontrado");
    return;
  }

  const instanceName = owner.phone.replace(/\D/g, "");

  try {
    const response = await fetch(
      `http://localhost:8080/instance/connectionState/${instanceName}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          apikey: "odLscVS5lhvKOQ2fTm05xy8EwEd8G8Fx",
        },
      }
    );

    const data = await response.json();
    if (data?.status === 404 || !data?.instance) {
  const createRes = await fetch("http://localhost:8080/instance/create", {
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
        events: ["CONNECTION_UPDATE", "QRCODE_UPDATED"]
      }
    }),
  });

  const createData = await createRes.json();

  if (createData.qrcode || createData.base64) {
    const qr = createData.qrcode ? createData.qrcode : { base64: createData.base64 };

    socket.emit("whatsapp_qrcode", {
      instance: instanceName,
      qrcode: qr,
    });

    socket.emit("whatsapp_connection_status", {
      instance: instanceName,
      status: "connecting",
      qrcode: qr,
    });
  } else {
    socket.emit("whatsapp_connection_status", {
      instance: instanceName,
      status: "creating",
    });
  }
  return;
}

    if (data.instance?.state === "open") {
  socket.emit("whatsapp_connection_status", {
    instance: instanceName,
    status: "open",
  });
  return;
}
 else {

      const connectResponse = await fetch(
        `http://localhost:8080/instance/connect/${instanceName}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            apikey: "odLscVS5lhvKOQ2fTm05xy8EwEd8G8Fx",
          },
        }
      );

      const connectData = await connectResponse.json();

      if (connectData?.base64) {
        socket.emit("whatsapp_qrcode", {
          instance: instanceName,
          qrcode: { base64: connectData.base64 },
        });

        socket.emit("whatsapp_connection_status", {
          instance: instanceName,
          status: "connecting",
          qrcode: { base64: connectData.base64 },
        });
      } else {
        socket.emit("whatsapp_connection_status", {
          instance: instanceName,
          status: "connecting",
        });
      }
    }
  } catch (err) {
    console.error("❌ [consult_instance] Erro ao consultar instância:", err);
  }
});


      socket.on("create_instance", async ({ ownerId }) => {

  const owner = await Owner.findById(ownerId);
  if (!owner) {
    console.error("❌ [create_instance] Owner não encontrado");
    return;
  }


  const instanceName = owner.phone.replace(/\D/g, "");

  try {
    const response = await fetch("http://localhost:8080/instance/create", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        apikey: "odLscVS5lhvKOQ2fTm05xy8EwEd8G8Fx",
      },
      body: JSON.stringify({ instanceName }),
    });

    const data = await response.json();

    if (data?.error || data?.status === "error") {
      console.error("❌ [create_instance] Erro na criação:", data.error || data);
      socket.emit("whatsapp_error", {
        error: data.error || "Erro ao criar instância",
      });
      return;
    }

    if (data.qrcode || data.base64) {
      const qr = data.qrcode ? data.qrcode : { base64: data.base64 };

      socket.emit("whatsapp_qrcode", {
        instance: instanceName,
        qrcode: qr,
      });

      socket.emit("whatsapp_connection_status", {
        instance: instanceName,
        status: "connecting",
        qrcode: qr,
      });
    } else if (data?.response?.message?.[0]?.includes("already in use")) {
      console.warn("⚠️ [create_instance] Instância já existe. Tentando reconectar...");

      const reconnectRes = await fetch(
        `http://localhost:8080/instance/connect/${instanceName}`,
        {
          method: "GET",
          headers: {
            "Content-Type": "application/json",
            apikey: "odLscVS5lhvKOQ2fTm05xy8EwEd8G8Fx",
          },
        }
      );

      const reconnectData = await reconnectRes.json();

      if (reconnectData?.base64) {
        socket.emit("whatsapp_qrcode", {
          instance: instanceName,
          qrcode: { base64: reconnectData.base64 },
        });

        socket.emit("whatsapp_connection_status", {
          instance: instanceName,
          status: "connecting",
          qrcode: { base64: reconnectData.base64 },
        });
      } else {
        socket.emit("whatsapp_connection_status", {
          instance: instanceName,
          status: "connecting",
        });
      }
    }
  } catch (err) {
    console.error("❌ [create_instance] Erro:", err);
  }
});

    });
  },

  getIO: () => {
    if (!io) {
      throw new Error("Socket.io não foi inicializado.");
    }
    return io;
  },
};
