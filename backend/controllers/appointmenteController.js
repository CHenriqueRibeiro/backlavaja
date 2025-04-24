const mongoose = require("mongoose");
const Appointment = require("../models/Appointment");
const Establishment = require("../models/Establishment");

function subtractOneMinute(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date(0, 0, 0, hours, minutes - 1);
  return date.toTimeString().slice(0, 5);
}

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

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res
        .status(404)
        .json({ message: "Estabelecimento não encontrado!" });
    }

    const selectedService = establishment.services.find(
      (s) => s._id?.toString() === serviceId
    );

    if (!selectedService) {
      return res.status(404).json({ message: "Serviço não encontrado!" });
    }

    const dayOfWeek = new Date(date).getDay();
    const daysOfWeek = [
      "Domingo",
      "Segunda",
      "Terça",
      "Quarta",
      "Quinta",
      "Sexta",
      "Sábado",
    ];
    const capitalizedDay = daysOfWeek[dayOfWeek];

    const availabilityDay = selectedService.availability.find(
      (a) => a.day === capitalizedDay
    );

    if (!availabilityDay) {
      return res
        .status(400)
        .json({ message: `Serviço indisponível para ${capitalizedDay}` });
    }

    const hourIsAvailable = availabilityDay.availableHours.some((h) => {
      return startTime >= h.start && endTime <= h.end;
    });

    if (!hourIsAvailable) {
      return res
        .status(400)
        .json({ message: "Horário indisponível para esse serviço." });
    }

    const agendamentosDoDia = await Appointment.countDocuments({
      service: serviceId,
      establishment: establishmentId,
      date,
    });

    if (agendamentosDoDia >= selectedService.dailyLimit) {
      return res
        .status(400)
        .json({ message: "Limite diário de agendamentos atingido!" });
    }

    const existingAppointment = await Appointment.findOne({
      service: serviceId,
      establishment: establishmentId,
      date,
      $or: [
        { startTime: { $lte: endTime }, endTime: { $gte: startTime } },
        { endTime: { $gte: startTime }, startTime: { $lte: endTime } },
      ],
    });

    if (existingAppointment) {
      return res.status(400).json({ message: "Horário já ocupado." });
    }

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

    await appointment.save();

    selectedService.availability = selectedService.availability.map((a) => {
      if (a.day === capitalizedDay) {
        const updatedHours = a.availableHours.filter((h) => {
          return !(h.start === startTime && h.end === endTime);
        });
        return { ...a.toObject(), availableHours: updatedHours };
      }
      return a;
    });

    await Establishment.updateOne(
      { _id: establishmentId, "services._id": serviceId },
      {
        $set: {
          "services.$.availability": selectedService.availability,
        },
      }
    );

    return res.status(201).json({
      message: "Agendamento realizado com sucesso!",
      appointment,
    });
  } catch (error) {
    console.error("Erro ao agendar serviço:", error);
    return res
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

exports.updateAppointmentStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res
        .status(400)
        .json({ message: "O campo 'status' é obrigatório." });
    }

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      { status },
      { new: true }
    );

    if (!updatedAppointment) {
      return res.status(404).json({ message: "Agendamento não encontrado." });
    }

    return res.status(200).json({
      message: "Status do agendamento atualizado com sucesso.",
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("Erro ao atualizar status do agendamento:", error);
    return res.status(500).json({
      message: "Erro ao atualizar status do agendamento.",
      error: error.message,
    });
  }
};

exports.updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const { price, serviceName, veiculo, startTime } = req.body;

    if (!serviceName || !price || !veiculo || !startTime) {
      return res
        .status(400)
        .json({ message: "Todos os campos são obrigatórios." });
    }

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Agendamento não encontrado." });
    }

    const establishment = await Establishment.findById(
      appointment.establishment
    );
    if (!establishment) {
      return res
        .status(404)
        .json({ message: "Estabelecimento não encontrado." });
    }

    const selectedService = establishment.services.find(
      (s) => s.name === serviceName
    );

    if (!selectedService) {
      return res.status(404).json({ message: "Serviço não encontrado." });
    }

    const [startHour, startMinute] = startTime.split(":").map(Number);
    const durationMinutes = selectedService.duration;
    const endDate = new Date(0, 0, 0, startHour, startMinute + durationMinutes);

    const rawEndTime = `${String(endDate.getHours()).padStart(2, "0")}:${String(
      endDate.getMinutes()
    ).padStart(2, "0")}`;
    const endTime = subtractOneMinute(rawEndTime);

    const updatedAppointment = await Appointment.findByIdAndUpdate(
      id,
      {
        serviceName,
        price,
        veiculo,
        startTime,
        endTime,
      },
      { new: true }
    );

    return res.status(200).json({
      message: "Agendamento atualizado com sucesso.",
      appointment: updatedAppointment,
    });
  } catch (error) {
    console.error("Erro ao atualizar o agendamento:", error);
    return res.status(500).json({
      message: "Erro ao atualizar o agendamento.",
      error: error.message,
    });
  }
};

exports.deleteAppointment = async (req, res) => {
  try {
    const { id } = req.params;

    if (!id) {
      return res
        .status(400)
        .json({ message: "ID do agendamento é obrigatório." });
    }

    const deletedAppointment = await Appointment.findByIdAndDelete(id);

    if (!deletedAppointment) {
      return res.status(404).json({ message: "Agendamento não encontrado." });
    }

    return res.status(200).json({
      message: "Agendamento deletado com sucesso.",
      appointment: deletedAppointment,
    });
  } catch (error) {
    console.error("Erro ao deletar o agendamento:", error);
    return res.status(500).json({
      message: "Erro ao deletar o agendamento.",
      error: error.message,
    });
  }
};
