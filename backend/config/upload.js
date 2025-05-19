const multer = require("multer");

const storage = multer.memoryStorage(); // OBRIGATÓRIO para usar buffer
const upload = multer({ storage });

module.exports = upload;
