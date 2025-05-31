const mongoose = require("mongoose");

const budgetSchema = new mongoose.Schema(
  {
    phone: { type: String, required: true },
    value: { type: Number, required: true },
    clientName: { type: String, required: true },
    serviceDescription: { type: String },
    plate: { type: String },
    brand: { type: String },
    model: { type: String },
    year: { type: String },
    referencePoint: { type: String },
    address: { type: String },
    observation: { type: String },
    date: { type: Date },
    dateValidate: { type: Date },
    deliveryDate: { type: Date },
    documentUrl: { type: String, required: true },
    establishmentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Establishment",
      required: true,
    },
    signatureUrl: { type: String },
    signedDocumentUrl: { type: String },
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
