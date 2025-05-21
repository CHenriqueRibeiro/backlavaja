const mongoose = require("mongoose");

const productSchema = new mongoose.Schema({
  name: { type: String, required: true },
  unidade: { type: String, default: "mL" },
  quantidadeAtual: { type: Number, required: true },
  estabelecimento: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Establishment",
    required: true,
  },
  servicos: [
    {
      service: { type: mongoose.Schema.Types.ObjectId, ref: "Service" },
      consumoPorServico: Number,
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
    },
  ],
});

module.exports = mongoose.model("Product", productSchema);
