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

    const diasSemana = [
      "Domingo",
      "Segunda",
      "Terça",
      "Quarta",
      "Quinta",
      "Sexta",
      "Sábado",
    ];

    const dateParts = date.split("-");
    const localDate = new Date(
      Number(dateParts[0]),
      Number(dateParts[1]) - 1,
      Number(dateParts[2]),
      12,
      0,
      0
    );
    const dayIndex = localDate.getDay();
    const dayName = diasSemana[dayIndex];
    const formattedDate = localDate.toISOString().split("T")[0];

    const servicesData = [];

    const openTime = parseTime(establishment.openingHours.open);
    const closeTime = parseTime(establishment.openingHours.close);

    const lunchStart = establishment.openingHours.hasLunchBreak
      ? parseTime(establishment.openingHours.intervalOpen)
      : null;
    const lunchEnd = establishment.openingHours.hasLunchBreak
      ? parseTime(establishment.openingHours.intervalClose)
      : null;

    for (const service of establishment.services) {
      const availabilityForDay = service.availability.find(
        (a) => a.day === dayName
      );

      if (!availabilityForDay) continue;

      const duration = service.duration;
      const concurrentLimit = service.concurrentService
        ? service.concurrentServiceValue
        : 1;

      const appointments = await Appointment.find({
        service: service._id,
        establishment: establishment._id,
        date: formattedDate,
      });

      const bookedTimes = appointments.map((app) => ({
        start: app.startTime,
        end: app.endTime,
      }));

      const availableSlots = [];

      for (const interval of availabilityForDay.availableHours) {
        let start = Math.max(parseTime(interval.start), openTime);
        const end = Math.min(parseTime(interval.end), closeTime);

        while (start + duration <= end) {
          const slotStartMinutes = start;
          const slotEndMinutes = start + duration;

          const slotStart = minutesToTime(slotStartMinutes);
          const slotEnd = minutesToTime(slotEndMinutes);

          const isInLunchBreak =
            lunchStart !== null &&
            lunchEnd !== null &&
            ((slotStartMinutes >= lunchStart && slotStartMinutes < lunchEnd) ||
              (slotEndMinutes > lunchStart && slotEndMinutes <= lunchEnd) ||
              (slotStartMinutes <= lunchStart && slotEndMinutes >= lunchEnd));

          if (isInLunchBreak) {
            // Avança para o fim do intervalo de almoço, mas verifica se ainda cabe dentro do dia
            start = lunchEnd;
            if (start + duration > end) break;
            continue;
          }

          const overlappingCount = bookedTimes.filter((bt) =>
            timesOverlap(slotStart, slotEnd, bt.start, bt.end)
          ).length;

          if (overlappingCount < concurrentLimit) {
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
