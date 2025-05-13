const mongoose = require("mongoose");
const fetch = require("node-fetch");
const Appointment = require("../models/Appointment");
const Establishment = require("../models/Establishment");

function subtractOneMinute(timeStr) {
  const [hours, minutes] = timeStr.split(":").map(Number);
  const date = new Date(0, 0, 0, hours, minutes - 1);
  return date.toTimeString().slice(0, 5);
}
const formatDateForWhatsApp = (date) => {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};
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
      "Segunda",
      "Terça",
      "Quarta",
      "Quinta",
      "Sexta",
      "Sábado",
      "Domingo",
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

    // Verifica agendamentos simultâneos no mesmo horário
    const overlappingAppointmentsCount = await Appointment.countDocuments({
      service: serviceId,
      establishment: establishmentId,
      date,
      startTime: { $lt: endTime },
      endTime: { $gt: startTime },
    });

    if (
      (!selectedService.concurrentService &&
        overlappingAppointmentsCount > 0) ||
      (selectedService.concurrentService &&
        overlappingAppointmentsCount >= selectedService.concurrentServiceValue)
    ) {
      return res.status(400).json({
        message: "Horário já atingiu o limite de agendamentos simultâneos.",
      });
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
    const formattedDate = formatDateForWhatsApp(date);
    const sanitizedPhone = `55${clientPhone.replace(/\D/g, "")}`;
    const whatsappBookingMessage = `Olá ${clientName}, o agendamento do(a) *${serviceName}* do(a) seu *${veiculo}* foi confirmado com sucesso para o dia *${formattedDate}* às *${startTime}*. Estamos esperando por você! 🚗✨`;

    try {
      const whatsappResponse = await fetch(
        "https://gateway.apibrasil.io/api/v2/whatsapp/sendText",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            DeviceToken: "b9c02e00-9ad8-4e46-85d5-a1722c118d01",
            Authorization:
              "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2dhdGV3YXkuYXBpYnJhc2lsLmlvL2FwaS92Mi9hdXRoL3JlZ2lzdGVyIiwiaWF0IjoxNzQ2MjkzODEwLCJleHAiOjE3Nzc4Mjk4MTAsIm5iZiI6MTc0NjI5MzgxMCwianRpIjoiUmpxOUNqcTgxeEJCMjBXMSIsInN1YiI6IjE1MDQwIiwicHJ2IjoiMjNiZDVjODk0OWY2MDBhZGIzOWU3MDFjNDAwODcyZGI3YTU5NzZmNyJ9.VW_KwDX30rsXJBKn7KpR9cqSK1HIz9Wej1qyeaFqs3Y",
          },
          body: JSON.stringify({
            number: sanitizedPhone,
            text: whatsappBookingMessage,
          }),
        }
      );

      if (!whatsappResponse.ok) {
        console.error(
          "Erro ao enviar mensagem de confirmação no WhatsApp:",
          await whatsappResponse.text()
        );
      }
    } catch (whatsappError) {
      console.error(
        "Erro ao tentar enviar mensagem pelo WhatsApp:",
        whatsappError
      );
    }

    // Atualiza disponibilidade (remove slot se não for concorrente)
    if (!selectedService.concurrentService) {
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
    }

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
    const { date } = req.query;

    const filter = { establishment: id };
    if (date) {
      filter.date = date;
    }

    const appointments = await Appointment.find(filter).lean();

    const establishment = await Establishment.findById(id).lean();
    if (!establishment) {
      return res
        .status(404)
        .json({ message: "Estabelecimento não encontrado" });
    }

    for (const appointment of appointments) {
      const service = establishment.services.find(
        (s) => s._id.toString() === appointment.service?.toString()
      );
      if (service) appointment.serviceName = service.name;
    }

    return res.json(appointments);
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erro ao buscar agendamentos", error: error.message });
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

    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ message: "Agendamento não encontrado." });
    }

    appointment.status = status;
    await appointment.save();

    const statusMessages = {
      Iniciado:
        "Ótima notícia! A lavagem do seu veículo já começou. Em breve ele estará pronto para você.",
      Agendado:
        "Seu agendamento foi confirmado com sucesso! Estamos esperando por você no horário combinado.",
      "Aguardando cliente":
        "Seu veículo está pronto, aguardamos a sua chegada para finalizarmos o atendimento.",
      Entregue:
        "Tudo certo! Seu veículo foi entregue com sucesso. Agradecemos pela preferência 😊",
      Cancelado:
        "Seu agendamento foi cancelado. Se precisar reagendar, estaremos à disposição!",
    };

    const messageToSend =
      statusMessages[status] ||
      `O status do seu agendamento foi alterado para: *${status}*`;

    const sanitizedPhone = `55${appointment.clientPhone.replace(/\D/g, "")}`;
    const whatsappResponse = await fetch(
      "https://gateway.apibrasil.io/api/v2/whatsapp/sendText",
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          DeviceToken: "b9c02e00-9ad8-4e46-85d5-a1722c118d01",
          Authorization:
            "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2dhdGV3YXkuYXBpYnJhc2lsLmlvL2FwaS92Mi9hdXRoL3JlZ2lzdGVyIiwiaWF0IjoxNzQ2MjkzODEwLCJleHAiOjE3Nzc4Mjk4MTAsIm5iZiI6MTc0NjI5MzgxMCwianRpIjoiUmpxOUNqcTgxeEJCMjBXMSIsInN1YiI6IjE1MDQwIiwicHJ2IjoiMjNiZDVjODk0OWY2MDBhZGIzOWU3MDFjNDAwODcyZGI3YTU5NzZmNyJ9.VW_KwDX30rsXJBKn7KpR9cqSK1HIz9Wej1qyeaFqs3Y",
        },
        body: JSON.stringify({
          number: sanitizedPhone,
          text: messageToSend,
        }),
      }
    );

    if (!whatsappResponse.ok) {
      console.error(
        "Erro ao enviar mensagem de status no WhatsApp:",
        await whatsappResponse.text()
      );
    }

    return res.status(200).json({
      message: "Status atualizado com sucesso.",
      appointment,
    });
  } catch (error) {
    console.error("Erro ao atualizar status do agendamento:", error);
    return res
      .status(500)
      .json({ message: "Erro ao atualizar status.", error: error.message });
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
