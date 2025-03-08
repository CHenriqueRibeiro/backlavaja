const express = require('express');
const router = express.Router();

// Importação dos routers
const establishmentRouter = require('./establishment');
const ownerRouter = require('./owner');
const loginOwner = require('./authRouter');

// Definindo os caminhos das rotas
router.use('/auth', loginOwner);  // Rota de login no caminho '/auth'
router.use('/establishment', establishmentRouter);
router.use("/owner", ownerRouter); // Rota para donos

module.exports = router;
