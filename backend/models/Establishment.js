const mongoose = require("mongoose");
const { Schema } = mongoose;

const establishmentSchema = new Schema({
    nameEstablishment: {
        type: String,
        required: true
    },
    address: {
        type: String,
        required: true
    },
    openingHours: {
        open: { type: String, required: true },
        close: { type: String, required: true }
    },
    image: {
        type: String,
        required: true
    },
    services: [{
        name: {
            type: String,
            required: true
        },
        description: {
            type: String,
            required: true
        },
        price: {
            type: Number,
            required: true
        },
        duration: {
            type: Number,
            required: true
        },
        dailyLimit: {
            type: Number,
            required: true
        },
        availability: [{
            day: {
                type: String, 
                enum: ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'],
                required: true
            },
            availableHours: [{
                start: { type: String, required: true },
                end: { type: String, required: true }
            }]
        }]
    }],
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Owner",
      }
}, { timestamps: true });

const Establishment = mongoose.model("Establishment", establishmentSchema);

module.exports = Establishment;
