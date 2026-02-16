const Client = require("../models/Clients");
const Establishment = require("../models/Establishment");

exports.registerCustomer = async (req, res) => {
  const { name, telefone, veiculos } = req.body;
  const { establishmentId } = req.params;

  try {
    if (!name || !telefone || !Array.isArray(veiculos) || veiculos.length === 0) {
      return res.status(400).json({
        message: "Nome, telefone e pelo menos um veículo são obrigatórios.",
      });
    }

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res.status(404).json({
        message: "Estabelecimento não encontrado.",
      });
    }

    // ✅ Normaliza telefone
    const telefoneNormalizado = telefone.replace(/\D/g, "");

    // ✅ Normaliza veículos
    let listaVeiculos = veiculos
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    if (listaVeiculos.length === 0) {
      return res.status(400).json({
        message: "É necessário informar pelo menos um veículo válido.",
      });
    }

    // Remove duplicados ignorando maiúscula/minúscula
    listaVeiculos = [
      ...new Map(
        listaVeiculos.map((v) => [v.toLowerCase(), v])
      ).values(),
    ];

    const clienteExistente = await Client.findOne({
      telefone: telefoneNormalizado,
      establishment: establishmentId,
    });

    if (clienteExistente) {
      return res.status(400).json({
        message: "Já existe cliente com esse telefone.",
      });
    }

    const client = await Client.create({
      name: name.trim(),
      telefone: telefoneNormalizado,
      veiculos: listaVeiculos,
      establishment: establishmentId,
    });

    return res.status(201).json({
      message: "Cliente criado com sucesso!",
      client,
    });

  } catch (error) {
    console.error("Erro ao criar cliente:", error);

    if (error.code === 11000) {
      return res.status(400).json({
        message: "Telefone já cadastrado para esse estabelecimento.",
      });
    }

    return res.status(500).json({
      message: "Erro interno ao criar cliente.",
    });
  }
};

exports.updateCustomer = async (req, res) => {
  const { name, telefone, veiculos } = req.body;
  const { clientId } = req.params;

  try {
    if (!name || !telefone || !Array.isArray(veiculos) || veiculos.length === 0) {
      return res.status(400).json({
        message: "Nome, telefone e pelo menos um veículo são obrigatórios.",
      });
    }

    const cliente = await Client.findById(clientId);
    if (!cliente) {
      return res.status(404).json({
        message: "Cliente não encontrado.",
      });
    }

    const telefoneNormalizado = telefone.replace(/\D/g, "");

    let listaVeiculos = veiculos
      .map((v) => v.trim())
      .filter((v) => v.length > 0);

    if (listaVeiculos.length === 0) {
      return res.status(400).json({
        message: "É necessário informar pelo menos um veículo válido.",
      });
    }

    listaVeiculos = [
      ...new Map(
        listaVeiculos.map((v) => [v.toLowerCase(), v])
      ).values(),
    ];

    // Verifica se telefone já existe para outro cliente
    const telefoneExistente = await Client.findOne({
      telefone: telefoneNormalizado,
      establishment: cliente.establishment,
      _id: { $ne: clientId },
    });

    if (telefoneExistente) {
      return res.status(400).json({
        message: "Já existe outro cliente com esse telefone.",
      });
    }

    cliente.name = name.trim();
    cliente.telefone = telefoneNormalizado;
    cliente.veiculos = listaVeiculos;

    await cliente.save();

    return res.status(200).json({
      message: "Cliente atualizado com sucesso!",
      cliente,
    });

  } catch (error) {
    console.error("Erro ao atualizar cliente:", error);

    return res.status(500).json({
      message: "Erro interno ao atualizar cliente.",
    });
  }
};

exports.addVehicle = async (req, res) => {
  const { veiculo } = req.body;
  const { clientId } = req.params;

  try {
    if (!veiculo || veiculo.trim().length === 0) {
      return res.status(400).json({
        message: "Veículo é obrigatório.",
      });
    }

    const cliente = await Client.findById(clientId);
    if (!cliente) {
      return res.status(404).json({
        message: "Cliente não encontrado.",
      });
    }

    const veiculoNormalizado = veiculo.trim();

    const jaExiste = cliente.veiculos.some(
      (v) => v.toLowerCase() === veiculoNormalizado.toLowerCase()
    );

    if (jaExiste) {
      return res.status(400).json({
        message: "Esse veículo já está cadastrado para o cliente.",
      });
    }

    cliente.veiculos.push(veiculoNormalizado);
    await cliente.save();

    return res.status(200).json({
      message: "Veículo adicionado com sucesso!",
      cliente,
    });

  } catch (error) {
    console.error("Erro ao adicionar veículo:", error);

    return res.status(500).json({
      message: "Erro interno ao adicionar veículo.",
    });
  }
};

exports.removeVehicle = async (req, res) => {
  const { veiculo } = req.body;
  const { clientId } = req.params;

  try {
    if (!veiculo) {
      return res.status(400).json({
        message: "Veículo é obrigatório.",
      });
    }

    const cliente = await Client.findById(clientId);
    if (!cliente) {
      return res.status(404).json({
        message: "Cliente não encontrado.",
      });
    }

    cliente.veiculos = cliente.veiculos.filter(
      (v) => v.toLowerCase() !== veiculo.toLowerCase()
    );

    if (cliente.veiculos.length === 0) {
      return res.status(400).json({
        message: "O cliente precisa ter pelo menos um veículo.",
      });
    }

    await cliente.save();

    return res.status(200).json({
      message: "Veículo removido com sucesso!",
      cliente,
    });

  } catch (error) {
    console.error("Erro ao remover veículo:", error);

    return res.status(500).json({
      message: "Erro interno ao remover veículo.",
    });
  }
};

exports.getCustomerByPhone = async (req, res) => {
  const { telefone } = req.query;
  const { establishmentId } = req.params;

  try {
    if (!telefone) {
      return res.status(400).json({
        message: "Telefone é obrigatório.",
      });
    }

    const telefoneNormalizado = telefone.replace(/\D/g, "");

    const cliente = await Client.findOne({
      telefone: telefoneNormalizado,
      establishment: establishmentId,
    });

    if (!cliente) {
      return res.status(404).json({
        message: "Cliente não encontrado.",
      });
    }

    return res.status(200).json(cliente);

  } catch (error) {
    console.error("Erro ao buscar cliente:", error);

    return res.status(500).json({
      message: "Erro interno ao buscar cliente.",
    });
  }
};

exports.deleteCustomer = async (req, res) => {
  const { clientId, establishmentId } = req.params;

  try {
    const cliente = await Client.findOne({
      _id: clientId,
      establishment: establishmentId,
    });

    if (!cliente) {
      return res.status(404).json({
        message: "Cliente não encontrado para esse estabelecimento.",
      });
    }

    await Client.deleteOne({ _id: clientId });

    return res.status(200).json({
      message: "Cliente removido com sucesso!",
    });

  } catch (error) {
    console.error("Erro ao remover cliente:", error);

    return res.status(500).json({
      message: "Erro interno ao remover cliente.",
    });
  }
};

