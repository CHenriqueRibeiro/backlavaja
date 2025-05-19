const mongoose = require("mongoose");

const costSchema = new mongoose.Schema(
  {
    value: { type: Number, required: true },
    type: { type: String, required: true },
    date: { type: Date, required: true },
    description: { type: String },
    observation: { type: String },
    establishment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Establishment",
      required: true,
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model("Cost", costSchema);
