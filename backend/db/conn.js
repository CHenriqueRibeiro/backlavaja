const mongoose = require("mongoose")

async function main() {
    try {
        await mongoose.connect(
            "mongodb+srv://HenriqueRibeiro:HKyK4wN7DU6W2oow@backlavaja.sihu5.mongodb.net/?retryWrites=true&w=majority&appName=BackLavaja"
        )
    console.log("Conectado ao banco de dados!")
    } catch (error) {
        console.log(`Erro: ${error}`)
    }
}

module.exports= main