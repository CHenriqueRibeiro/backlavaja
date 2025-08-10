const { mongoose } = require("mongoose");

const appointmentSchema = new mongoose.Schema({
  clientName: { type: String, required: true },
  clientPhone: { type: String, required: true },
  veiculo: { type: String, required: true },
  serviceName: { type: String, required: true },
  reminderWhatsapp: { type: Boolean, required: false, default: false },
  price: { type: Number, required: true },
  status: { type: String, required: true, default: "Agendado" },
  service: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Service",
    required: true,
  },
  establishment: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Establishment",
    required: true,
  },
  date: { type: String, required: true },
  origin: { type: String, required: true },
  startTime: { type: String, required: true },
  endTime: { type: String, required: true },
  fotos: [{ type: String }],
});

const Appointment = mongoose.model("Appointment", appointmentSchema);
module.exports = Appointment;
