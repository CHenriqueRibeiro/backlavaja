const Product = require("../models/Product");
const Establishment = require("../models/Establishment");
const Service = require("../models/Service");

exports.createProduct = async (req, res) => {
  const { name, unidade, quantidadeAtual, servicos } = req.body;
  const { establishmentId } = req.params;

  try {
    const establishment = await Establishment.findById(establishmentId);
    if (!establishment)
      return res
        .status(404)
        .json({ message: "Estabelecimento não encontrado." });

    // Validação opcional dos serviços referenciados
    for (const s of servicos) {
      const serviceExists = await Service.findById(s.service);
      if (!serviceExists) {
        return res
          .status(400)
          .json({ message: `Serviço com ID ${s.service} não encontrado.` });
      }
    }

    const product = new Product({
      name,
      unidade,
      quantidadeAtual,
      estabelecimento: establishmentId,
      servicos,
    });

    await product.save();
    return res
      .status(201)
      .json({ message: "Produto criado com sucesso!", product });
  } catch (error) {
    console.error("Erro ao criar produto:", error);
    return res.status(500).json({ message: "Erro interno ao criar produto." });
  }
};

exports.getProductsByEstablishment = async (req, res) => {
  const { establishmentId } = req.params;
  try {
    const products = await Product.find({
      estabelecimento: establishmentId,
    }).populate("servicos.service", "name");
    return res.json(products);
  } catch (error) {
    console.error("Erro ao buscar produtos:", error);
    return res.status(500).json({ message: "Erro ao buscar produtos." });
  }
};
