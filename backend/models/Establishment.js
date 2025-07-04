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
        required: false,
      },
      coordinates: {
        type: [Number],
        required: false,
      },
    },
    services: {
      type: [
        {
          name: { type: String },
          description: { type: String },
          price: { type: Number },
          duration: { type: Number },
          //dailyLimit: { type: Number },
          availability: [
            {
              day: {
                type: String,
                enum: [
                  "Segunda",
                  "Terça",
                  "Quarta",
                  "Quinta",
                  "Sexta",
                  "Sábado",
                  "Domingo",
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
          concurrentService: { type: Boolean, default: false },
          concurrentServiceValue: { type: Number },
        },
      ],
      default: [],
    },
    costs: {
      type: [
        {
          value: { type: Number, required: true },
          type: { type: String, required: true },
          date: { type: Date, required: true },
          description: { type: String },
          observation: { type: String },
        },
      ],
      default: [],
    },
    budgets: [
      {
        phone: String,
        title: String,
        clientName: String,
        serviceDescription: String,
        date: Date,
        dateValidate: Date,
        deliveryDate: Date,
        value: Number,
        services: [
          {
            name: String,
            value: Number,
            observation: String,
          },
        ],
        documentUrl: String,
        publicLink: String,
        plate: String,
        signatureUrl: { type: String, default: "" },
        signedDocumentUrl: { type: String, default: "" },
        updatedAt: Date,
      },
    ],

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
        "Segunda",
        "Terça",
        "Quarta",
        "Quinta",
        "Sexta",
        "Sábado",
        "Domingo",
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
