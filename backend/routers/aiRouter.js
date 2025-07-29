const express = require("express");
const router = express.Router();
const iaController = require("../controllers/iaController");
//const authMiddleware = require("../middleware/auth");

router.get("/prever-consumo/:establishmentId", iaController.preverConsumo);
router.get(
  "/analise-com-servicos/:establishmentId",
  iaController.analiseFinanceiraComServicos
);

router.get(
  "/mais-frequentes/:establishmentId",
  iaController.clientesMaisFrequentes
);
router.post('/precificacao/:establishmentId', iaController.precificacaoComIA);


module.exports = router;
