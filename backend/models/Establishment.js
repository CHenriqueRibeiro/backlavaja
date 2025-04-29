const mongoose = require("mongoose");
const { Schema } = mongoose;

const establishmentSchema = new Schema(
  {
    nameEstablishment: { type: String, required: true },
    paymentMethods: {
      type: [String],
      default: [],
    },
    address: {
      street: { type: String, required: true },
      number: { type: String, required: true },
      neighborhood: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      cep: { type: Number, required: true },
      complement: { type: String, required: false },
    },
    location: {
      type: {
        type: String,
        enum: ["Point"],
        required: true,
      },
      coordinates: {
        type: [Number],
        required: true,
      },
    },
    services: {
      type: [
        {
          name: { type: String },
          description: { type: String },
          price: { type: Number },
          duration: { type: Number },
          dailyLimit: { type: Number },
          availability: [
            {
              day: {
                type: String,
                enum: [
                  "Domingo",
                  "Segunda",
                  "Terça",
                  "Quarta",
                  "Quinta",
                  "Sexta",
                  "Sábado",
                ],
              },
              availableHours: [
                {
                  start: { type: String },
                  end: { type: String },
                },
              ],
            },
          ],
        },
      ],
      default: [],
    },
    openingHours: {
      open: { type: String, required: true },
      close: { type: String, required: true },
      hasLunchBreak: { type: Boolean, default: false },
      intervalOpen: { type: String },
      intervalClose: { type: String },
    },
    workingDays: {
      type: [String],
      enum: [
        "Domingo",
        "Segunda",
        "Terça",
        "Quarta",
        "Quinta",
        "Sexta",
        "Sábado",
      ],
      required: true,
    },

    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Owner",
    },
  },
  { timestamps: true }
);

establishmentSchema.index({ location: "2dsphere" });
const Establishment = mongoose.model("Establishment", establishmentSchema);

module.exports = Establishment;
