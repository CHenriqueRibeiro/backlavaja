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
  const { serviceId } = req.params;
  const { name, description, price, availableDays, availableHours } = req.body;

  try {
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Serviço não encontrado" });
    }

    const establishment = await Establishment.findById(service.establishment);
    if (establishment.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        message: "Você não tem permissão para atualizar este serviço.",
      });
    }

    service.name = name || service.name;
    service.description = description || service.description;
    service.price = price || service.price;
    service.price = concurrentService || service.concurrentService;
    service.availableDays = availableDays || service.availableDays;
    service.availableHours = availableHours || service.availableHours;

    await service.save();

    return res
      .status(200)
      .json({ message: "Serviço atualizado com sucesso!", service });
  } catch (error) {
    return res
      .status(500)
      .json({ message: "Erro ao atualizar serviço.", error });
  }
};

exports.deleteService = async (req, res) => {
  const { serviceId } = req.params;

  try {
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: "Serviço não encontrado!" });
    }

    const establishment = await Establishment.findById(service.establishment);
    if (establishment.owner.toString() !== req.user._id.toString()) {
      return res
        .status(403)
        .json({ message: "Você não tem permissão para excluir este serviço." });
    }

    const establishmentUpdate = await Establishment.findOne({
      services: serviceId,
    });
    if (establishmentUpdate) {
      establishmentUpdate.services.pull(serviceId);
      await establishmentUpdate.save();
    }

    await service.remove();

    return res.status(200).json({ message: "Serviço excluído com sucesso!" });
  } catch (error) {
    return res.status(500).json({ message: "Erro ao excluir serviço.", error });
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
    console.log("Erro ao buscar serviços:", error);
    return res.status(500).json({ message: "Erro ao buscar serviços." });
  }
};
