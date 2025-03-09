const Establishment = require('../models/Establishment');
const Owner = require('../models/Owner');

exports.createEstablishment = async (req, res) => {
  try {
    const {
      nameEstablishment,
      address,
      openingHours,
      image,
      owner
    } = req.body;

    if (!nameEstablishment || !address || !openingHours || !image || !owner) {
      return res.status(400).json({ message: 'Campos obrigatórios faltando' });
    }

    const ownerExists = await Owner.findById(owner);
    if (!ownerExists) {
      return res.status(404).json({ message: 'Dono não encontrado' });
    }


    const newEstablishment = new Establishment({
      nameEstablishment,
      address,
      openingHours,
      image,
      owner
    });

    await newEstablishment.save();

    ownerExists.establishments.push(newEstablishment);
    await ownerExists.save();

    return res.status(201).json({
      message: 'Estabelecimento criado com sucesso!',
      establishment: newEstablishment
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Erro ao criar o estabelecimento', error });
  }
};
