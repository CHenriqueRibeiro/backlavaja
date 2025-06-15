const Establishment = require("../models/Establishment");
const Owner = require("../models/Owner");

exports.createEstablishment = async (req, res) => {
  try {
    const {
      nameEstablishment,
      address,
      openingHours,
      owner,
      paymentMethods,
      workingDays,
    } = req.body;

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
      !owner ||
      !workingDays ||
      !Array.isArray(workingDays) ||
      workingDays.length === 0
    ) {
      return res.status(400).json({ message: "Campos obrigatórios faltando" });
    }

    const diasValidos = [
      "Segunda",
      "Terça",
      "Quarta",
      "Quinta",
      "Sexta",
      "Sábado",
      "Domingo",
    ];
    const diasInvalidos = workingDays.filter(
      (dia) => !diasValidos.includes(dia)
    );
    if (diasInvalidos.length > 0) {
      return res.status(400).json({
        message: `Dias inválidos: ${diasInvalidos.join(", ")}`,
      });
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
            "Horário de intervalo é obrigatório quando 'hasLunchBreak' é true",
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
      workingDays,
      owner,
      paymentMethods: paymentMethods || [],
    });

    await newEstablishment.save();

    ownerExists.establishments.push(newEstablishment._id);
    ownerExists.onboardingSteps.estabelecimento = true;
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

    return res.status(200).json({
      statusConta: owner.statusConta,
      dataLimite: owner.dataLimite
        ? owner.dataLimite.toLocaleDateString("pt-BR")
        : null,
      historicoStatus: owner.historicoStatus.map((item) => ({
        status: item.status,
        data: item.data.toLocaleDateString("pt-BR"),
        plano: item.plano,
      })),
      onboardingSteps: owner.onboardingSteps,
      establishments: owner.establishments,
    });
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
    const {
      nameEstablishment,
      address,
      openingHours,
      paymentMethods,
      workingDays,
    } = req.body;

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

    if (workingDays !== undefined) {
      const diasValidos = [
        "Segunda",
        "Terça",
        "Quarta",
        "Quinta",
        "Sexta",
        "Sábado",
        "Domingo",
      ];
      const diasInvalidos = workingDays.filter(
        (dia) => !diasValidos.includes(dia)
      );
      if (diasInvalidos.length > 0) {
        return res.status(400).json({
          message: `Dias inválidos: ${diasInvalidos.join(", ")}`,
        });
      }
      establishment.workingDays = workingDays;
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
exports.deleteEstablishment = async (req, res) => {
  try {
    const { establishmentId } = req.params;

    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res
        .status(404)
        .json({ message: "Estabelecimento não encontrado" });
    }

    const owner = await Owner.findById(establishment.owner);
    if (owner) {
      owner.establishments = owner.establishments.filter(
        (estId) => estId.toString() !== establishmentId
      );
      await owner.save();
    }

    await Establishment.findByIdAndDelete(establishmentId);

    return res
      .status(200)
      .json({ message: "Estabelecimento deletado com sucesso" });
  } catch (error) {
    console.error(error);
    return res
      .status(500)
      .json({ message: "Erro ao deletar o estabelecimento", error });
  }
};

exports.updateOnboardingStep = async (req, res) => {
  try {
    const { ownerId } = req.params;
    const { step, completed } = req.body;

    if (!["estabelecimento", "servico"].includes(step)) {
      return res.status(400).json({ message: "Passo inválido." });
    }

    const owner = await Owner.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ message: "Dono não encontrado." });
    }

    owner.onboardingSteps[step] = completed;
    await owner.save();

    return res.status(200).json({
      message: `Passo '${step}' atualizado com sucesso.`,
      onboardingSteps: owner.onboardingSteps,
    });
  } catch (error) {
    console.error(error);
    return res.status(500).json({
      message: "Erro ao atualizar passo de onboarding.",
      error,
    });
  }
};
