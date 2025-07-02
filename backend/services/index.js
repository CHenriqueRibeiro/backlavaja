/*const cron = require("node-cron");
const Appointment = require("../models/Appointment");
const fetch = require("node-fetch");

const formatDateForWhatsApp = (date) => {
  const [year, month, day] = date.split("-");
  return `${day}/${month}/${year}`;
};

cron.schedule("* * * * *", async () => {
  const now = new Date();
  const targetTime = new Date(now.getTime() + 15 * 60000);

  if (isNaN(targetTime.getTime())) {
    console.error("targetTime é uma data inválida:", targetTime);
    return;
  }

  const currentDate = targetTime.toISOString().split("T")[0];
  const targetHour = String(targetTime.getHours()).padStart(2, "0");
  const targetMinute = String(targetTime.getMinutes()).padStart(2, "0");
  const formattedTime = `${targetHour}:${targetMinute}`;
  try {
    const appointments = await Appointment.find({
      date: currentDate,
      startTime: formattedTime,
      reminderWhatsapp: true,
    });

    for (const appointment of appointments) {
      const sanitizedPhone = `55${appointment.clientPhone.replace(/\D/g, "")}`;
      const message = `Olá ${
        appointment.clientName
      },passando para lembrar que o agendamento do(a) *${
        appointment.serviceName
      }* para o veículo *${appointment.veiculo}* está marcado para as *${
        appointment.startTime
      }* do dia *${formatDateForWhatsApp(appointment.date)}*. Até breve!`;

      const response = await fetch(
        "http://localhost:8080/message/sendText/instance",
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
            text: message,
          }),
        }
      );

      if (!response.ok) {
        console.error("Erro ao enviar lembrete:", await response.text());
      }
    }
  } catch (err) {
    console.error("Erro no cron de lembretes:", err.message);
  }
});*/
