const Establishment = require('../models/Establishment');

exports.createEstablishment = async (req, res) => {
  try {

    const {
      nameEstablishment,
      address,
      openingHours,
      image,
      services,
      owner
    } = req.body;

    if (!nameEstablishment || !address || !openingHours || !image || !services || !owner) {
      return res.status(400).json({ message: 'Campos obrigatórios faltando' });
    }

    const newEstablishment = new Establishment({
      nameEstablishment,
      address,
      openingHours,
      image,
      services,
      owner
    });

    await newEstablishment.save();

    return res.status(201).json({
      message: 'Estabelecimento criado com sucesso!',
      establishment: newEstablishment
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ message: 'Erro ao criar o estabelecimento', error });
  }
};
