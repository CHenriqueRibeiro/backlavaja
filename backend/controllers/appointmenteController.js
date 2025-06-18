const mongoose = require("mongoose");
const fetch = require("node-fetch");
const Appointment = require("../models/Appointment");
const Establishment = require("../models/Establishment");
const Product = require("../models/Product");
function converterParaML(valor, unidade) {
  switch (unidade) {
    case "L":
      return valor * 1000;
    default:
      return valor;
  }
}

function converterConsumoParaUnidadeDoProduto(
  valor,
  unidadeConsumo,
  unidadeProduto
) {
  const emML = converterParaML(valor, unidadeConsumo);
  const divisor = unidadeProduto === "L" ? 1000 : 1;
  return emML / divisor;
}

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
      reminderWhatsapp,
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

    const [year, month, day] = date.split("-").map(Number);
    const localDateAtMidnight = new Date(year, month - 1, day, 0, 0, 0);

    const dayOfWeek = localDateAtMidnight.getDay();

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
      reminderWhatsapp,
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
            DeviceToken: "d98654e6-d47b-48a6-89d5-7cac993c371c",
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

    if (appointment.status === "Entregue") {
      return res.status(400).json({
        message: "Este agendamento já foi finalizado e não pode ser alterado.",
      });
    }

    appointment.status = status;
    await appointment.save();

    if (status?.trim().toLowerCase() === "entregue") {
      const produtos = await Product.find({
        estabelecimento: appointment.establishment,
      });

      for (const produto of produtos) {
        if (!produto.servicos || produto.servicos.length === 0) continue;

        const uso = produto.servicos.find(
          (s) => s.service?.toString?.() === appointment.service.toString()
        );

        if (uso) {
          const consumoConvertido = converterConsumoParaUnidadeDoProduto(
            uso.consumoPorServico,
            uso.unidadeConsumo || "mL",
            produto.unidade || "mL"
          );

          produto.quantidadeAtual -= consumoConvertido;
          if (produto.quantidadeAtual < 0) produto.quantidadeAtual = 0;

          produto.consumoHistorico.push({
            agendamento: appointment._id,
            data: new Date(),
            quantidade: consumoConvertido,
            service: appointment.service,
            cliente: appointment.clientName,
            veiculo: appointment.veiculo,
            telefone: appointment.clientPhone,
          });

          await produto.save();
        }
      }
    }

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
          DeviceToken: "d98654e6-d47b-48a6-89d5-7cac993c371c",
          Authorization:
            "Bearer eyJ0eXAiOiJKV1QiLCJhbGciOiJIUzI1NiJ9.eyJpc3MiOiJodHRwczovL2dhdGV3YXkuYXBpYnJhc2lsLmlvL2FwaS92Mi9hdXRoL3JlZ2lzdGVyIiwiaWF0IjoxNzQ2MjkzODEwLCJleHAiOjE3Nzc4Mjk4MTAsIm5iZiI6MTc0NjI5MzgxMCwianRpIjoiUmpxOUNqcTgxeEJCMjBXMSIsInN1YiI6IjE1MDQwIiwicHJ2IjoiMjNiZDVjODk0OWY2MDBhZGIzOWU3MDFjNDAwODcyZGI3YTU5NzZmNyJ9.VW_KwDX30rsXJBKn7KpR9cqSK1HIz9Wej1qyeaFqs3Y", // mantenha o seu token real
        },
        body: JSON.stringify({ number: sanitizedPhone, text: messageToSend }),
      }
    );

    if (!whatsappResponse.ok) {
      console.error(
        "Erro ao enviar mensagem de status no WhatsApp:",
        await whatsappResponse.text()
      );
    }

    return res
      .status(200)
      .json({ message: "Status atualizado com sucesso.", appointment });
  } catch (error) {
    console.error("Erro ao atualizar status do agendamento:", error);
    return res
      .status(500)
      .json({ message: "Erro ao atualizar status.", error: error.message });
  }
};

exports.getDashboardReport = async (req, res) => {
  try {
    const { establishmentId, startDate, endDate } = req.query;

    if (!establishmentId || !startDate || !endDate) {
      return res.status(400).json({
        message: "Parâmetros obrigatórios: establishmentId, startDate, endDate",
      });
    }

    const appointments = await Appointment.find({
      establishment: establishmentId,
      date: { $gte: startDate, $lte: endDate },
      status: "Entregue",
    });

    const totalRevenue = appointments.reduce(
      (acc, curr) => acc + curr.price,
      0
    );

    const serviceTypesMap = {};
    const paymentMethodsMap = { Cartao: 0, Dinheiro: 0, Pix: 0 };
    const reservedHoursMap = {};
    const weeklyRevenueByDay = {
      Dom: 0,
      Seg: 0,
      Ter: 0,
      Qua: 0,
      Qui: 0,
      Sex: 0,
      Sáb: 0,
    };

    appointments.forEach((a) => {
      if (!serviceTypesMap[a.serviceName]) {
        serviceTypesMap[a.serviceName] = 0;
      }
      serviceTypesMap[a.serviceName]++;

      const hourKey = `${a.startTime.slice(0, 2)}h`;
      if (!reservedHoursMap[hourKey]) reservedHoursMap[hourKey] = 0;
      reservedHoursMap[hourKey]++;

      const weekday = new Date(a.date).toLocaleDateString("pt-BR", {
        weekday: "short",
      });
      const formattedDay =
        weekday.charAt(0).toUpperCase() + weekday.slice(1, 3);
      if (weeklyRevenueByDay[formattedDay] !== undefined) {
        weeklyRevenueByDay[formattedDay] += a.price;
      }
    });

    return res.json({
      totalRevenue,
      serviceTypes: serviceTypesMap,
      paymentMethods: paymentMethodsMap,
      reservedHours: reservedHoursMap,
      weeklyRevenueByDay,
    });
  } catch (error) {
    console.error("Erro no dashboard:", error);
    return res
      .status(500)
      .json({ message: "Erro ao gerar relatório.", error: error.message });
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

exports.updateAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    const {
      price,
      serviceName,
      serviceId,
      veiculo,
      date,
      startTime,
      endTime,
      reminderWhatsapp,
    } = req.body;

    if (
      !serviceName ||
      !price ||
      !veiculo ||
      !date ||
      !serviceId ||
      !startTime ||
      !endTime
    ) {
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
      (s) => s._id.toString() === serviceId
    );
    if (!selectedService) {
      return res.status(404).json({ message: "Serviço não encontrado." });
    }
    const [year, month, day] = date.split("-").map(Number);
    const localDateAtMidnight = new Date(year, month - 1, day, 0, 0, 0);
    const daysOfWeek = [
      "Domingo",
      "Segunda",
      "Terça",
      "Quarta",
      "Quinta",
      "Sexta",
      "Sábado",
    ];
    const capitalizedDay = daysOfWeek[localDateAtMidnight.getDay()];
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

    const overlappingAppointmentsCount = await Appointment.countDocuments({
      _id: { $ne: id },
      service: serviceId,
      establishment: appointment.establishment,
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

    appointment.serviceName = serviceName;
    appointment.service = serviceId;
    appointment.veiculo = veiculo;
    appointment.date = date;
    appointment.startTime = startTime;
    appointment.endTime = endTime;
    appointment.price = price;
    appointment.reminderWhatsapp = reminderWhatsapp;

    await appointment.save();

    return res.status(200).json({
      message: "Agendamento atualizado com sucesso.",
      appointment,
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
