const Appointment = require("../models/Appointment");
const Establishment = require("../models/Establishment");

function parseTime(time) {
  const [h, m] = time.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTime(minutes) {
  const h = Math.floor(minutes / 60)
    .toString()
    .padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

function timesOverlap(start1, end1, start2, end2) {
  return start1 < end2 && start2 < end1;
}

const diasSemana = [
  "segunda",
  "terça",
  "quarta",
  "quinta",
  "sexta",
  "sábado",
  "domingo",
];

exports.getAvailabilityByDate = async (req, res) => {
  try {
    const establishmentId = req.params.id;
    const { date } = req.query;

    if (!date) {
      return res.status(400).json({ error: "A data é obrigatória na query." });
    }

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res.status(404).json({ error: "Estabelecimento não encontrado" });
    }

    const dateObj = new Date(date);
    const dayIndex = dateObj.getDay();
    const dayName = diasSemana[dayIndex];
    const formattedDate = dateObj.toISOString().split("T")[0];

    const servicesData = [];

    for (const service of establishment.services) {
      const availabilityForDay = service.availability.find(
        (a) => a.day.toLowerCase() === dayName
      );

      if (!availabilityForDay) continue;

      const duration = service.duration;
      const dailyLimit = service.dailyLimit;

      const appointments = await Appointment.find({
        service: service._id,
        establishment: establishment._id,
        date: formattedDate,
      });

      const bookedCount = appointments.length;
      if (bookedCount >= dailyLimit) continue;

      const bookedTimes = appointments.map((app) => ({
        start: app.startTime,
        end: app.endTime,
      }));

      const availableSlots = [];

      for (const interval of availabilityForDay.availableHours) {
        let start = parseTime(interval.start);
        const end = parseTime(interval.end);

        while (start + duration <= end) {
          const slotStart = minutesToTime(start);
          const slotEnd = minutesToTime(start + duration);

          const overlap = bookedTimes.some((bt) =>
            timesOverlap(slotStart, slotEnd, bt.start, bt.end)
          );

          if (!overlap) {
            availableSlots.push(`${slotStart} - ${slotEnd}`);
          }

          start += duration;
        }
      }

      if (availableSlots.length > 0) {
        servicesData.push({
          serviceName: service.name,
          serviceId: service._id,
          price: service.price,
          duration,
          availableSlots,
        });
      }
    }

    res.json({ date: formattedDate, services: servicesData });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Erro ao buscar disponibilidade" });
  }
};
