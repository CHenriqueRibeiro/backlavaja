const Establishment = require("../models/Establishment");
const Owner = require("../models/Owner");

exports.createEstablishment = async (req, res) => {
  try {
    const { nameEstablishment, address, openingHours, owner, paymentMethods } =
      req.body;

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

    if (!openingHours?.open || !openingHours?.close) {
      return res.status(400).json({
        message: "Horário de abertura e fechamento são obrigatórios",
      });
    }

    const newOpeningHours = {
      open: openingHours.open,
      close: openingHours.close,
      hasLunchBreak: openingHours.hasLunchBreak || false,
    };

    if (newOpeningHours.hasLunchBreak) {
      if (!openingHours.intervalOpen || !openingHours.intervalClose) {
        return res.status(400).json({
          message:
            "Horário de intervalo é obrigatório quando 'hasInterval' é true",
        });
      }
      newOpeningHours.intervalOpen = openingHours.intervalOpen;
      newOpeningHours.intervalClose = openingHours.intervalClose;
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
        complement: address.complement || "",
      },
      location: {
        type: "Point",
        coordinates: [address.longitude, address.latitude],
      },
      openingHours: newOpeningHours,
      owner,
      paymentMethods: paymentMethods || [],
    });

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

exports.updateEstablishment = async (req, res) => {
  try {
    const { establishmentId } = req.params;
    const { nameEstablishment, address, openingHours, paymentMethods } =
      req.body;

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res
        .status(404)
        .json({ message: "Estabelecimento não encontrado" });
    }

    if (nameEstablishment !== undefined) {
      establishment.nameEstablishment = nameEstablishment;
    }

    if (address) {
      establishment.address = {
        ...establishment.address.toObject(),
        ...address,
      };
      if (address.latitude !== undefined && address.longitude !== undefined) {
        establishment.location = {
          type: "Point",
          coordinates: [address.longitude, address.latitude],
        };
      }
    }

    if (openingHours) {
      const updatedOpeningHours = {
        ...establishment.openingHours.toObject(),
        ...openingHours,
      };

      if (openingHours.hasLunchBreak) {
        if (!openingHours.intervalOpen || !openingHours.intervalClose) {
          return res.status(400).json({
            message:
              "Horário de intervalo é obrigatório quando 'hasLunchBreak' é true",
          });
        }
        updatedOpeningHours.intervalOpen = openingHours.intervalOpen;
        updatedOpeningHours.intervalClose = openingHours.intervalClose;
      }

      establishment.openingHours = updatedOpeningHours;
    }

    if (paymentMethods !== undefined) {
      establishment.paymentMethods = paymentMethods;
    }

    await establishment.save();

    return res.status(200).json({
      message: "Estabelecimento atualizado com sucesso!",
      establishment,
    });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erro ao atualizar estabelecimento", error });
  }
};
