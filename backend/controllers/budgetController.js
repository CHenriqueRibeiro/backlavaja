//const Budget = require("../models/Budget");
const Establishment = require("../models/Establishment");
const streamifier = require("streamifier");

exports.createBudget = async (req, res) => {
  const cloudinary = require("../config/cloudinary");
  try {
    const payload = JSON.parse(req.body.data);
    const {
      phone,
      clientName,
      serviceDescription,
      establishmentId,
      date,
      dateValidate,
      deliveryDate,
      value,
      services,
      plate,
      brand,
      model,
      year,
      referencePoint,
      address,
      observation,
    } = payload;

    if (!req.file || !req.file.buffer) {
      return res
        .status(400)
        .json({ error: "Arquivo PDF não enviado corretamente" });
    }

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res.status(404).json({ error: "Estabelecimento não encontrado" });
    }

    const result = await new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          resource_type: "image",
          public_id: `orcamento-${Date.now()}`,
          folder: "orcamentos",
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      streamifier.createReadStream(req.file.buffer).pipe(uploadStream);
    });

    const newBudget = {
      phone,
      clientName,
      serviceDescription,
      plate,
      brand,
      model,
      year,
      referencePoint,
      address,
      observation,
      date: date || new Date(),
      dateValidate: dateValidate || new Date(),
      deliveryDate: deliveryDate || new Date(),
      value,
      services,
      documentUrl: result.secure_url,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    establishment.budgets.push(newBudget);
    await establishment.save();

    res.status(201).json(newBudget);
  } catch (err) {
    console.error("Erro ao criar orçamento:", err);
    res.status(500).json({ error: "Erro ao criar orçamento" });
  }
};

exports.deleteBudget = async (req, res) => {
  try {
    const { establishmentId, budgetId } = req.params;

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res.status(404).json({ error: "Estabelecimento não encontrado" });
    }

    const index = establishment.budgets.findIndex(
      (b) => String(b._id) === budgetId
    );
    if (index === -1) {
      return res.status(404).json({ error: "Orçamento não encontrado" });
    }

    establishment.budgets.splice(index, 1);
    await establishment.save();

    res.status(200).json({ message: "Orçamento removido com sucesso" });
  } catch (err) {
    console.error("Erro ao deletar orçamento:", err);
    res.status(500).json({ error: "Erro ao deletar orçamento" });
  }
};
