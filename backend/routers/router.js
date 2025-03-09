const express = require('express');
const router = express.Router();

const establishmentRouter = require('./establishment');
const ownerRouter = require('./owner');
const loginOwner = require('./authRouter');
const serviceRouter = require('./servicesRouter');
const authMiddleware = require('../authMiddleware/auth');

router.use("/services", authMiddleware, serviceRouter);  // Exemplo de aplicação no roteamento de serviços
router.use("/auth", loginOwner);  // Rota de login não precisa do middleware
router.use("/establishment", authMiddleware, establishmentRouter); // Aplica o middleware para autenticar rotas de estabelecimentos
router.use("/owner", authMiddleware, ownerRouter); // Aplica para o owner

module.exports = router;
