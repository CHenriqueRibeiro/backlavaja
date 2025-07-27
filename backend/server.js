require("dotenv").config();
require("./services");

const express = require("express");
const http = require("http");
const cors = require("cors");
const app = express();
const server = http.createServer(app);
const { Server } = require("socket.io");

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});

io.on("connection", (socket) => {
  console.log("🔗 Novo socket conectado:", socket.id);

  socket.on("join_establishment_room", (establishmentId) => {
    socket.join(establishmentId);
  });

  socket.on("disconnect", () => {
    console.log("🔌 Socket desconectado:", socket.id);
  });
});

app.use(cors());
app.use(express.json());

const conn = require("./db/conn");
conn();

const routers = require("./routers/router");
app.use("/api", routers);

app.set("socketio", io);

const { setIO } = require("./config/socket");
setIO(io);

server.listen(3000, function () {
  console.log("Servidor online com Socket.IO!!");
});
