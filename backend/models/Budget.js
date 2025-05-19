const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true },
    title: { type: String, required: true },
    value: { type: Number, required: true },
    clientName: { type: String, required: true },
    serviceDescription: { type: String },
    date: { type: Date },
    dateValidate: { type: Date },
    deliveryDate: { type: Date },
    documentUrl: { type: String, required: true },
    establishmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Establishment",
      required: true,
    },
    services: [
      {
        name: { type: String, required: true },
        value: { type: Number, required: true },
        observation: { type: String },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("Budget", budgetSchema);
