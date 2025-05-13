const mongoose = require("mongoose");

const serviceSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      required: true,
    },
    price: {
      type: Number,
      required: true,
    },
    duration: {
      type: Number,
      required: true,
    },
    dailyLimit: {
      type: Number,
      required: false,
    },
    concurrentService: {
      type: Boolean,
      default: false,
    },
    concurrentServiceValue: {
      type: Number,
      required: false,
    },
    availability: [
      {
        day: {
          type: String,
          required: true,
        },
        availableHours: [
          {
            start: {
              type: String,
              required: true,
            },
            end: {
              type: String,
              required: true,
            },
          },
        ],
      },
    ],
    establishment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Establishment",
      required: true,
    },
  },
  { timestamps: true }
);

const Service = mongoose.model("Service", serviceSchema);

module.exports = Service;
