const Service = require("../models/Service");
const Establishment = require("../models/Establishment");

exports.createService = async (req, res) => {
  const {
    name,
    description,
    price,
    duration,
    dailyLimit,
    availability,
    concurrentService,
    concurrentServiceValue,
  } = req.body;
  const establishmentId = req.params.establishmentId;

  try {
    const establishment = await Establishment.findById(establishmentId);

    if (!establishment) {
      return res
        .status(404)
        .json({ message: "Estabelecimento não encontrado." });
    }

    const service = new Service({
      name,
      description,
      price,
      duration,
      dailyLimit,
      availability,
      establishment: establishmentId,
      owner: establishment.owner,
      concurrentService,
      concurrentServiceValue,
    });

    await service.save();

    establishment.services.push({
      _id: service._id,
      name: service.name,
      description: service.description,
      price: service.price,
      duration: service.duration,
      dailyLimit: service.dailyLimit,
      availability: service.availability,
      concurrentService: service.concurrentService,
      concurrentServiceValue: service.concurrentServiceValue,
    });

    await establishment.save();

    return res.status(201).json({
      message: "Serviço criado com sucesso!",
      service,
    });
  } catch (error) {
    console.error("Erro ao criar serviço:", error);
    return res.status(500).json({ message: "Erro ao criar serviço.", error });
  }
};

exports.updateService = async (req, res) => {
  const { establishmentId, serviceId } = req.params;
  const userId = req.user._id ?? req.user.ownerId;
  const {
    name,
    description,
    price,
    duration,
    dailyLimit,
    availability,
    concurrentService,
    concurrentServiceValue,
  } = req.body;

  try {
    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res
        .status(404)
        .json({ message: "Estabelecimento não encontrado." });
    }

    if (establishment.owner.toString() !== userId) {
      return res.status(403).json({
        message: "Você não tem permissão para atualizar este serviço.",
      });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Serviço não encontrado." });
    }

    if (service.establishment.toString() !== establishmentId) {
      return res
        .status(400)
        .json({ message: "Este serviço não pertence a este estabelecimento." });
    }

    service.name = name ?? service.name;
    service.description = description ?? service.description;
    service.price = price ?? service.price;
    service.duration = duration ?? service.duration;
    service.dailyLimit = dailyLimit ?? service.dailyLimit;
    service.availability = availability ?? service.availability;
    service.concurrentService = concurrentService ?? service.concurrentService;
    service.concurrentServiceValue =
      concurrentServiceValue ?? service.concurrentServiceValue;

    await service.save();

    const idx = establishment.services.findIndex(
      (s) => s._id.toString() === serviceId
    );
    if (idx > -1) {
      establishment.services[idx] = {
        _id: service._id,
        name: service.name,
        description: service.description,
        price: service.price,
        duration: service.duration,
        dailyLimit: service.dailyLimit,
        availability: service.availability,
        concurrentService: service.concurrentService,
        concurrentServiceValue: service.concurrentServiceValue,
      };
      await establishment.save();
    }

    return res.status(200).json({
      message: "Serviço atualizado com sucesso!",
      service,
    });
  } catch (error) {
    console.error("Erro ao atualizar serviço:", error);
    return res
      .status(500)
      .json({ message: "Erro ao atualizar serviço.", error: error.message });
  }
};

exports.deleteService = async (req, res) => {
  const { establishmentId, serviceId } = req.params;
  const userId = req.user._id ?? req.user.ownerId;

  try {
    const establishment = await Establishment.findById(establishmentId);
    if (!establishment) {
      return res
        .status(404)
        .json({ message: "Estabelecimento não encontrado." });
    }

    if (establishment.owner.toString() !== userId) {
      return res.status(403).json({
        message: "Você não tem permissão para excluir este serviço.",
      });
    }

    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Serviço não encontrado." });
    }
    if (service.establishment.toString() !== establishmentId) {
      return res.status(400).json({
        message: "Este serviço não pertence a este estabelecimento.",
      });
    }

    await Service.findByIdAndDelete(serviceId);

    const idx = establishment.services.findIndex(
      (s) => s._id.toString() === serviceId
    );
    if (idx > -1) {
      establishment.services.splice(idx, 1);
      await establishment.save();
    }

    return res.status(200).json({ message: "Serviço excluído com sucesso!" });
  } catch (error) {
    console.error("Erro ao excluir serviço:", error);
    return res
      .status(500)
      .json({ message: "Erro ao excluir serviço.", error: error.message });
  }
};

exports.getAllServices = async (req, res) => {
  try {
    const services = await Service.find()
      .populate("establishment", "name")
      .populate("owner", "name");

    return res.status(200).json({ services });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao obter serviços.", error });
  }
};

exports.getServicesByEstablishment = async (req, res) => {
  const establishmentId = req.params.establishmentId;

  try {
    const establishment = await Establishment.findById(establishmentId);

    if (!establishment) {
      return res
        .status(404)
        .json({ message: "Estabelecimento não encontrado." });
    }

    return res.status(200).json({ services: establishment });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao buscar serviços." });
  }
};
