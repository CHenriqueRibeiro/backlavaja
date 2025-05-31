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
    origin: "*", // Ajuste conforme necessário
    methods: ["GET", "POST", "PATCH", "DELETE"],
  },
});

// Conexão de clientes Socket.IO
io.on("connection", (socket) => {
  socket.on("disconnect", () => {});
});

// Middleware para CORS e JSON
app.use(cors());
app.use(express.json());

// Conectar ao banco de dados
const conn = require("./db/conn");
conn();

// Importar e usar rotas
const routers = require("./routers/router");
app.use("/api", routers);

// 💡 Adicionado - globaliza o io para uso nos controllers
app.set("socketio", io);

// 🚀 Salva o io em um módulo global
const { setIO } = require("./config/socket");
setIO(io);

server.listen(3000, function () {
  console.log("Servidor online com Socket.IO!!");
});
