const mongoose = require("mongoose");
const { Schema } = mongoose;

const establishmentSchema = new Schema(
  {
    nameEstablishment: {
      type: String,
      required: true,
    },
    address: {
      street: { type: String, required: true },
      number: { type: String, required: true },
      neighborhood: { type: String, required: true },
      city: { type: String, required: true },
      state: { type: String, required: true },
      latitude: { type: Number, required: true },
      longitude: { type: Number, required: true },
      cep: { type: Number, required: true },
    },
    openingHours: {
      open: { type: String, required: true },
      close: { type: String, required: true },
    },
    services: {
      type: [
        {
          name: {
            type: String,
          },
          description: {
            type: String,
          },
          price: {
            type: Number,
          },
          duration: {
            type: Number,
          },
          dailyLimit: {
            type: Number,
          },
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
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Owner",
    },
  },
  { timestamps: true }
);

const Establishment = mongoose.model("Establishment", establishmentSchema);

module.exports = Establishment;
