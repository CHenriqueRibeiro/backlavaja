const express = require("express");
const router = express.Router();
const clientController = require("../controllers/clientController");

/*
  ==========================
  CLIENTES POR ESTABELECIMENTO
  ==========================
*/

// ✅ Criar cliente
router.post(
  "/:establishmentId/clients",
  clientController.registerCustomer
);

// ✅ Buscar cliente por telefone
router.get(
  "/:establishmentId/clients",
  clientController.getCustomerByPhone
);

// ✅ Atualizar cliente
router.put(
  "/:establishmentId/clients/:clientId",
  clientController.updateCustomer
);

// ✅ Deletar cliente
router.delete(
  "/:establishmentId/clients/:clientId",
  clientController.deleteCustomer
);

// ✅ Adicionar veículo
router.patch(
  "/:establishmentId/clients/:clientId/add-vehicle",
  clientController.addVehicle
);

// ✅ Remover veículo
router.patch(
  "/:establishmentId/clients/:clientId/remove-vehicle",
  clientController.removeVehicle
);

module.exports = router;
