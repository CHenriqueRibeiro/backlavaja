const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  unidade: { type: String, default: "mL" },
  quantidadeAtual: { type: Number, required: true },
  preco: { type: Number, required: true },
  estabelecimento: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Establishment",
    required: true,
  },
  servicos: [
    {
      service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
      consumoPorServico: Number,
      unidadeConsumo: { type: String, default: "mL" },
    },
  ],
  consumoHistorico: [
    {
      agendamento: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Appointment",
      },
      data: { type: Date, default: Date.now },
      quantidade: Number,
      service: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Service",
      },
      cliente: String,
      veiculo: String,
      telefone: String,
    },
  ],
  entradas: [
    {
      data: { type: Date, default: Date.now },
      quantidade: { type: Number, required: true },
      precoUnitario: { type: Number, required: true },
      observacao: { type: String },
    },
  ],
});

module.exports = mongoose.model("Product", productSchema);
