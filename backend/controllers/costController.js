const { default: mongoose } = require("mongoose");
const Cost = require("../models/Cost");
const Establishment = require("../models/Establishment");

// Criar custo
exports.createCost = async (req, res) => {
  try {
    const { value, type, date, description, observation, establishmentId } =
      req.body;

    if (!value || !type || !date || !establishmentId) {
      return res.status(400).json({ error: "Campos obrigatórios faltando" });
    }

    const cost = await Cost.create({
      value,
      type,
      date,
      description,
      observation,
      establishment: establishmentId,
    });

    await Establishment.findByIdAndUpdate(establishmentId, {
      $push: { costs: cost },
    });

    res.status(201).json(cost);
  } catch (error) {
    console.error("Erro ao criar custo:", error);
    res.status(500).json({ error: "Erro ao criar custo" });
  }
};

exports.updateCost = async (req, res) => {
  try {
    const { costId } = req.params;
    const { value, type, date, description, observation, establishmentId } =
      req.body;

    console.log("Recebido costId:", costId);
    console.log("Recebido establishmentId:", establishmentId);

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      console.log("Estabelecimento não encontrado");
      return res.status(404).json({ error: "Estabelecimento não encontrado" });
    }

    const cost = establishment.costs.id(costId);
    if (!cost) {
      console.log("Custo não encontrado no array de custos embutidos");
      return res.status(404).json({ error: "Custo não encontrado" });
    }

    if (value !== undefined) cost.value = value;
    if (type !== undefined) cost.type = type;
    if (date !== undefined) cost.date = date;
    if (description !== undefined) cost.description = description;
    if (observation !== undefined) cost.observation = observation;

    await establishment.save();

    console.log("Custo atualizado com sucesso:", cost);
    res.status(200).json(cost);
  } catch (error) {
    console.error("Erro ao atualizar custo:", error);
    res.status(500).json({ error: "Erro ao atualizar custo" });
  }
};

exports.deleteCost = async (req, res) => {
  try {
    const { costId, establishmentId } = req.params;

    console.log("Tentando deletar costId:", costId);
    console.log("Establishment alvo:", establishmentId);

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res.status(404).json({ error: "Estabelecimento não encontrado" });
    }

    const indexToRemove = establishment.costs.findIndex(
      (cost) => cost._id.toString() === costId
    );

    if (indexToRemove === -1) {
      console.log("Custo não encontrado para o ID:", costId);
      return res.status(404).json({ error: "Custo não encontrado" });
    }

    establishment.costs.splice(indexToRemove, 1);
    await establishment.save();

    res.status(200).json({ message: "Custo deletado com sucesso" });
  } catch (error) {
    console.error("Erro ao deletar custo:", error);
    res.status(500).json({ error: "Erro ao deletar custo" });
  }
};
