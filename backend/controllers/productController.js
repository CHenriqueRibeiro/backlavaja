const Product = require("../models/Product");
const Establishment = require("../models/Establishment");
const Service = require("../models/Service");

exports.createProduct = async (req, res) => {
  const { name, unidade, quantidadeAtual, servicos, preco } = req.body;
  const { establishmentId } = req.params;

  try {
    const establishment = await Establishment.findById(establishmentId);
    if (!establishment)
      return res
        .status(404)
        .json({ message: "Estabelecimento não encontrado." });

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
      preco,
      quantidadeAtual,
      estabelecimento: establishmentId,
      servicos: servicos.map((s) => ({
        service: s.service,
        consumoPorServico: s.consumoPorServico,
        unidadeConsumo: s.unidadeConsumo || "mL",
      })),
      entradas: [
        {
          quantidade: quantidadeAtual,
          precoUnitario: preco,
          observacao: "Entrada inicial do produto",
          data: new Date(),
        },
      ],
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

exports.updateProduct = async (req, res) => {
  const { productId } = req.params;
  const { name, unidade, preco, servicos } = req.body;

  try {
    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json({ message: "Produto não encontrado." });

    product.name = name;
    product.preco = preco;
    product.unidade = unidade;
    product.servicos = [];

    if (Array.isArray(servicos)) {
      for (const s of servicos) {
        const serviceExists = await Service.findById(s.service);
        if (!serviceExists) {
          return res
            .status(400)
            .json({ message: `Serviço com ID ${s.service} não encontrado.` });
        }
        product.servicos.push({
          service: s.service,
          consumoPorServico: s.consumoPorServico,
          unidadeConsumo: s.unidadeConsumo || "mL",
        });
      }
    }

    await product.save();
    return res
      .status(200)
      .json({ message: "Produto atualizado com sucesso.", product });
  } catch (error) {
    console.error("Erro ao atualizar produto:", error);
    return res
      .status(500)
      .json({ message: "Erro interno ao atualizar produto." });
  }
};
exports.reporEstoque = async (req, res) => {
  const { productId } = req.params;
  const { quantidade, precoUnitario, observacao } = req.body;

  if (!quantidade || !precoUnitario) {
    return res
      .status(400)
      .json({ message: "Informe quantidade e preço unitário." });
  }

  try {
    const product = await Product.findById(productId);
    if (!product)
      return res.status(404).json({ message: "Produto não encontrado." });

    product.quantidadeAtual += quantidade;

    product.entradas = product.entradas || [];
    product.entradas.push({
      quantidade,
      precoUnitario,
      observacao,
      data: new Date(),
    });

    await product.save();
    return res.status(200).json({
      message: "Reposição registrada com sucesso.",
      produto: product,
    });
  } catch (error) {
    console.error("Erro ao repor estoque:", error);
    return res.status(500).json({ message: "Erro interno ao repor estoque." });
  }
};

exports.deleteProduct = async (req, res) => {
  const { productId } = req.params;

  try {
    const deleted = await Product.findByIdAndDelete(productId);
    if (!deleted)
      return res.status(404).json({ message: "Produto não encontrado." });

    return res.status(200).json({ message: "Produto deletado com sucesso." });
  } catch (error) {
    console.error("Erro ao deletar produto:", error);
    return res
      .status(500)
      .json({ message: "Erro interno ao deletar produto." });
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
