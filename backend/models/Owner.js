const mongoose = require("mongoose");

const ownerSchema = new mongoose.Schema(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    phone: { type: String, required: true },
    isTemporaryPassword: { type: Boolean, default: false },
    statusConta: { type: String, default: "teste" },
    dataLimiteTeste: { type: Date },
    establishments: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Establishment",
      },
    ],
  },
  { timestamps: true }
);

const Owner = mongoose.model("Owner", ownerSchema);
module.exports = Owner;
