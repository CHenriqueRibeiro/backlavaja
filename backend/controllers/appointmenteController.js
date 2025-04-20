const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const Establishment = require("../models/Establishment");

exports.bookAppointment = async (req, res) => {
  try {
    const {
      clientName,
      clientPhone,
      veiculo,
      serviceName,
      price,
      status,
      serviceId,
      establishmentId,
      date,
      startTime,
      endTime,
    } = req.body;

    if (
      !clientName ||
      !clientPhone ||
      !veiculo ||
      !serviceName ||
      !price ||
      !status ||
      !serviceId ||
      !establishmentId ||
      !date ||
      !startTime ||
      !endTime
    ) {
      return res
        .status(400)
        .json({ message: "Todos os campos são obrigatórios!" });
    }

    if (
      !mongoose.Types.ObjectId.isValid(serviceId) ||
      !mongoose.Types.ObjectId.isValid(establishmentId)
    ) {
      return res
        .status(400)
        .json({ message: "ID de serviço ou estabelecimento inválido!" });
    }

    // Criando o novo agendamento
    const appointment = new Appointment({
      clientName,
      clientPhone,
      veiculo,
      serviceName,
      price,
      status,
      service: serviceId,
      establishment: establishmentId,
      date,
      startTime,
      endTime,
    });

    // Salvando o agendamento no banco de dados
    await appointment.save();

    // Respondendo com sucesso
    res
      .status(201)
      .json({ message: "Agendamento realizado com sucesso!", appointment });
  } catch (error) {
    console.error("Erro ao agendar serviço:", error);
    res
      .status(500)
      .json({ message: "Erro ao agendar serviço.", error: error.message });
  }
};

exports.getAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find()
      .populate("service")
      .populate("establishment");
    res.status(200).json(appointments);
  } catch (error) {
    res.status(500).json({
      message: "Erro ao buscar agendamentos.",
      error: error.message || error,
    });
  }
};

exports.getAppointmentsByEstablishment = async (req, res) => {
  try {
    const { id } = req.params;
    const appointments = await Appointment.find({ establishment: id }).lean();

    const establishment = await Establishment.findById(id).lean();
    if (!establishment) {
      return res
        .status(404)
        .json({ message: "Estabelecimento não encontrado" });
    }

    for (const appointment of appointments) {
      const service = establishment.services.find(
        (s) => s._id?.toString() === appointment.service?.toString()
      );

      if (service) {
        appointment.serviceName = service.name;
      }
    }

    return res.json(appointments);
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: "Erro ao buscar agendamentos" });
  }
};
