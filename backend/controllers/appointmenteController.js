const Appointment = require("../models/Appointment");
const Establishment = require("../models/Establishment");
const mongoose = require("mongoose");

exports.bookAppointment = async (req, res) => {
  try {
    const { clientName, clientPhone, serviceId, establishmentId, date, startTime } = req.body;

    if (!clientName || !clientPhone || !serviceId || !establishmentId || !date || !startTime) {
      return res.status(400).json({ message: "Todos os campos são obrigatórios!" });
    }

    if (!mongoose.Types.ObjectId.isValid(serviceId) || !mongoose.Types.ObjectId.isValid(establishmentId)) {
      return res.status(400).json({ message: "ID de serviço ou estabelecimento inválido!" });
    }

    const establishment = await Establishment.findOne({
      _id: new mongoose.Types.ObjectId(establishmentId),
      "services._id": new mongoose.Types.ObjectId(serviceId),
    });

    if (!establishment) {
      return res.status(404).json({ message: "Estabelecimento não encontrado." });
    }

    const service = establishment.services.find(s => s._id.toString() === serviceId);
    if (!service) {
      return res.status(404).json({ message: "Serviço não encontrado no estabelecimento especificado." });
    }

    const duration = service.duration;

    const start = new Date(`${date}T${startTime}:00`);

    const endTime = new Date(start.getTime() + duration * 60000);

    const formattedEndTime = `${endTime.getHours().toString().padStart(2, "0")}:${endTime.getMinutes().toString().padStart(2, "0")}`;

    const existingAppointment = await Appointment.findOne({
      service: serviceId,
      date,
      $or: [
        { startTime: { $lte: startTime }, endTime: { $gt: startTime } },
        { startTime: { $lt: formattedEndTime }, endTime: { $gte: formattedEndTime } },
        { startTime: { $gte: startTime }, endTime: { $lte: formattedEndTime } },
      ]
    });

    if (existingAppointment) {
      return res.status(400).json({ message: "Este horário já está ocupado." });
    }

    const appointment = new Appointment({
      clientName,
      clientPhone,
      service: serviceId,
      establishment: establishmentId,
      date,
      startTime,
      endTime: formattedEndTime,
    });

    await appointment.save();
    res.status(201).json({ message: "Agendamento realizado com sucesso!", appointment });

  } catch (error) {
    console.error("Erro ao agendar serviço:", error);
    res.status(500).json({ message: "Erro ao agendar serviço.", error: error.message || error });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find().populate("service").populate("establishment");
    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar agendamentos.", error: error.message || error });
  }
};

exports.getAppointmentsByEstablishment = async (req, res)=> {
  try {
      const { id } = req.params;
      const appointments = await Appointment.find({ establishment: id }).lean();

      const establishment = await Establishment.findById(id).lean();
      if (!establishment) {
          return res.status(404).json({ message: "Estabelecimento não encontrado" });
      }

      for (const appointment of appointments) {
          const service = establishment.services.find(s => s._id?.toString() === appointment.service?.toString());

          if (service) {
              appointment.serviceName = service.name;
          }
      }

      return res.json(appointments);
  } catch (error) {
      console.error(error);
      return res.status(500).json({ message: "Erro ao buscar agendamentos" });
  }
}
