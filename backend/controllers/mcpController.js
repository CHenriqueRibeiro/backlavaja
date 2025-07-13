const Owner = require("../models/Owner");
const Establishment = require("../models/Establishment");
const Appointment = require("../models/Appointment");
const McpSession = require("../models/Mcp");

// Utilitário para formatar listas
const formatList = (items) =>
  items.map((item, i) => `${i + 1}. ${item}`).join("\n");

exports.mcpStepHandler = async (req, res) => {
  const { phone, step, payload } = req.body;

  try {
    // Busca o dono e o estabelecimento relacionado
    const owner = await Owner.findOne({ phone }).lean();
    if (!owner)
      return res.status(404).json({ text: "Proprietário não encontrado." });

    const establishmentId = owner.establishments[0];
    const establishment = await Establishment.findById(establishmentId).lean();
    if (!establishment)
      return res.status(404).json({ text: "Estabelecimento não encontrado." });

    // Carrega ou cria sessão persistente
    let session =
      (await McpSession.findOne({ phone })) || new McpSession({ phone });

    switch (step) {
      case "start": {
        const options = establishment.services.map(
          (s) => `${s.name} - R$ ${s.price}`
        );

        await McpSession.updateOne(
          { phone },
          { phone, step: "service" },
          { upsert: true }
        );

        return res.json({
          text: `Escolha o serviço desejado:\n${formatList(options)}`,
          step: "service",
        });
      }

      case "service": {
        const index = parseInt(payload.trim()) - 1;
        const selectedService = establishment.services[index];
        if (!selectedService)
          return res.status(400).json({ text: "Serviço inválido." });

        await McpSession.updateOne(
          { phone },
          {
            service: selectedService,
            step: "day",
          }
        );

        const diasDisponiveis = selectedService.availability.map((a) => a.day);
        return res.json({
          text: `Perfeito! Agora escolha o dia disponível:\n${formatList(
            diasDisponiveis
          )}`,
          step: "day",
        });
      }

      case "day": {
        const { service } = session;
        if (!service)
          return res
            .status(400)
            .json({ text: "Serviço não encontrado na sessão." });

        const diaSelecionado = payload.trim();
        const dia = service.availability.find(
          (a) => a.day.toLowerCase() === diaSelecionado.toLowerCase()
        );

        if (!dia) return res.status(400).json({ text: "Dia inválido." });

        await McpSession.updateOne(
          { phone },
          {
            day: dia.day,
            step: "hour",
          }
        );

        const horarios = dia.availableHours.map(
          (h, i) => `${i + 1}. ${h.start} às ${h.end}`
        );

        return res.json({
          text: `Escolha um horário disponível para ${
            dia.day
          }:\n${horarios.join("\n")}`,
          step: "hour",
        });
      }

      case "hour": {
        const { service, day } = session;

        if (!service || !day)
          return res.status(400).json({ text: "Dados da sessão incompletos." });

        const dia = service.availability.find((a) => a.day === day);
        if (!dia)
          return res
            .status(400)
            .json({ text: "Dia não encontrado no serviço." });

        const horario = dia.availableHours[parseInt(payload.trim()) - 1];
        if (!horario)
          return res.status(400).json({ text: "Horário inválido." });

        await McpSession.updateOne(
          { phone },
          {
            hour: horario,
            step: "name",
          }
        );

        return res.json({
          text: "Por favor, informe seu nome para finalizarmos o agendamento:",
          step: "name",
        });
      }

      case "name": {
        const { service, day, hour } = session;
        const clientName = payload.trim();

        const newAppointment = new Appointment({
          clientName,
          clientPhone: phone,
          veiculo: "Não informado",
          serviceName: service.name,
          service: service._id,
          establishment: establishment._id,
          date: day,
          startTime: hour.start,
          endTime: hour.end,
          status: "Agendado",
        });

        await newAppointment.save();
        await McpSession.deleteOne({ phone }); // Limpa a sessão

        return res.json({
          text: `✅ Agendamento realizado com sucesso para *${day}*, das *${hour.start} às ${hour.end}*.\nObrigado, ${clientName}! 🚗✨`,
          step: "done",
        });
      }

      default:
        return res.status(400).json({ text: "Etapa desconhecida." });
    }
  } catch (error) {
    console.error("Erro no fluxo do MCP:", error);
    return res.status(500).json({ text: "Erro interno ao processar o fluxo." });
  }
};
exports.getSessionStep = async (req, res) => {
  const { phone } = req.params;

  try {
    const session = await McpSession.findOne({ phone });

    if (!session) {
      return res.status(404).json({ text: "Sessão não encontrada." });
    }

    return res.json({
      step: session.step,
      session,
    });
  } catch (error) {
    console.error("Erro ao buscar sessão:", error);
    return res.status(500).json({ text: "Erro ao buscar a sessão." });
  }
};
