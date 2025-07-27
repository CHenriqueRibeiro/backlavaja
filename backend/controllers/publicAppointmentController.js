const Establishment = require("../models/Establishment");
const Service = require("../models/Service");
const Appointment = require("../models/Appointment");

exports.getPublicEstablishment = async (req, res) => {
  try {
    const { establishmentId } = req.params;

    const establishment = await Establishment.findById(establishmentId).lean();
    if (!establishment) {
      return res.status(404).json({ message: "Estabelecimento não encontrado." });
    }

    res.json({
      id: establishment._id,
      name: establishment.nameEstablishment,
      logo: establishment.logo || null,
      phone: establishment.phone || null,
      address: establishment.address || null,
      location: establishment.location || null,
      openingHours: establishment.openingHours || null,
      workingDays: establishment.workingDays || [],
      paymentMethods: establishment.paymentMethods || [],
      services: (establishment.services || []).map(service => ({
        id: service._id,
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        availability: service.availability || [],
        concurrentService: service.concurrentService || false,
      })),
    });
  } catch (error) {
    res.status(500).json({ message: "Erro ao buscar dados públicos.", error: error.message });
  }
};

exports.getPublicServiceSlots = async (req, res) => {
  try {
    const { establishmentId, serviceId } = req.params;
    const { date } = req.query;

    const service = await Service.findById(serviceId).lean();
    if (!service) return res.status(404).json({ message: "Serviço não encontrado." });

    const dias = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];
    const dataDate = new Date(date + "T00:00:00");
    const diaSemana = dias[dataDate.getDay()];

    const diaDisponivel = service.availability.find(d => d.day === diaSemana);
    if (!diaDisponivel)
      return res.status(400).json({ message: "Serviço não disponível para este dia." });

    let slots = [];
    for (const faixa of diaDisponivel.availableHours) {
      let start = faixa.start;
      let end = faixa.end;
      let [hStart, mStart] = start.split(":").map(Number);
      let [hEnd, mEnd] = end.split(":").map(Number);
     const slotSize = service.duration || 30;
const startMin = hStart * 60 + mStart;
const endMin = hEnd * 60 + mEnd;
for (let min = startMin; min + slotSize <= endMin; min += slotSize) {
  const slotH = Math.floor(min / 60);
  const slotM = min % 60;
  const slotTime = `${slotH.toString().padStart(2, '0')}:${slotM.toString().padStart(2, '0')}`;
  slots.push(slotTime);
}

    }

    const appointments = await Appointment.find({
      establishment: establishmentId,
      service: serviceId,
      date
    }).lean();

    const ocupados = appointments.map(a => a.startTime);

    const disponiveis = slots.filter(s => !ocupados.includes(s));

    res.json({ slots: disponiveis });
  } catch (error) {
    console.error("Erro ao buscar horários:", error);
    res.status(500).json({ message: "Erro ao buscar horários.", error: error.message });
  }
};

exports.bookPublicAppointment = async (req, res) => {
  try {
    const { establishmentId, serviceId } = req.params;
    const { clientName, clientPhone, veiculo, date, startTime } = req.body;
    const service = await Service.findById(serviceId).lean();
    if (!service) return res.status(404).json({ message: "Serviço não encontrado." });

    const [h, m] = startTime.split(':').map(Number);
    const duration = service.duration || 30;
    const endDate = new Date(2000, 0, 1, h, m + duration);
    const endTime = endDate.toTimeString().slice(0,5);

    const overlapping = await Appointment.findOne({
      establishment: establishmentId,
      service: serviceId,
      date,
      startTime: { $lt: endTime },
      endTime: { $gt: startTime }
    });
    if (overlapping) {
      return res.status(409).json({ message: "Horário já agendado." });
    }

    const appointment = await Appointment.create({
      clientName,
      clientPhone,
      veiculo,
      serviceName: service.name,
      price: service.price,
      status: "Agendado",
      service: serviceId,
      establishment: establishmentId,
      date,
      startTime,
      endTime
    });

    res.status(201).json({ message: "Agendamento criado com sucesso!", appointment });
  } catch (error) {
    res.status(500).json({ message: "Erro ao criar agendamento.", error: error.message });
  }
};
