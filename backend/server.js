require("dotenv").config();
require("../backend/services");

const express = require("express");
const cors = require("cors");
const app = express();

app.use(cors());

app.use(express.json());

const conn = require("./db/conn");

conn();

const routers = require("./routers/router");

app.use("/api", routers);

app.listen(3000, function () {
  console.log("servidor online!!");
});
