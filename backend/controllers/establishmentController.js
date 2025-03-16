const Establishment = require("../models/Establishment");
const Owner = require("../models/Owner");

exports.createEstablishment = async (req, res) => {
  console.log("entrou");
  try {
    const { nameEstablishment, address, openingHours, owner } = req.body;

    if (
      !nameEstablishment ||
      !address?.street ||
      !address?.number ||
      !address?.neighborhood ||
      !address?.city ||
      !address?.cep ||
      !address?.state ||
      !address?.latitude ||
      !address?.longitude ||
      !owner
    ) {
      return res.status(400).json({ message: "Campos obrigatórios faltando" });
    }

    const ownerExists = await Owner.findById(owner);
    if (!ownerExists) {
      return res.status(404).json({ message: "Dono não encontrado" });
    }

    const newEstablishment = new Establishment({
      nameEstablishment,
      address: {
        state: address.state,
        city: address.city,
        neighborhood: address.neighborhood,
        street: address.street,
        number: address.number,
        cep: address.cep,
        latitude: address.latitude,
        longitude: address.longitude,
      },
      openingHours: {
        open: openingHours.open,
        close: openingHours.close,
      },
      owner,
    });
    console.log(newEstablishment);
    await newEstablishment.save();

    ownerExists.establishments.push(newEstablishment);
    await ownerExists.save();

    return res.status(201).json({
      message: "Estabelecimento criado com sucesso!",
      establishment: newEstablishment,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erro ao criar o estabelecimento", error });
  }
};

exports.getEstablishmentsByOwner = async (req, res) => {
  try {
    const { ownerId } = req.params;

    const owner = await Owner.findById(ownerId).populate("establishments");
    if (!owner) {
      return res.status(404).json({ message: "Dono não encontrado" });
    }
    return res.status(200).json({ establishments: owner.establishments });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erro ao buscar estabelecimentos", error });
  }
};
