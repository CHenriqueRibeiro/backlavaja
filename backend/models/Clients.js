const mongoose = require("mongoose");

const clientSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true,
    },
    telefone: {
      type: String,
      required: true,
      trim: true,
    },

    veiculos: [
      {
        type: String,
        trim: true,
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

clientSchema.index(
  { telefone: 1, establishment: 1 },
  { unique: true }
);

module.exports = mongoose.model("Client", clientSchema);
