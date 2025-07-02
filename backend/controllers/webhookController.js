// backend/controllers/webhookController.js
const webhookController = {
  handleConnectionStatus: async (req, res) => {
    const { instance, status } = req.body;

    const io = req.app.get("socketio");

    io.emit("whatsapp_connection_status", {
      instance,
      status,
    });

    res.status(200).json({ success: true });
  },
};

module.exports = webhookController;
