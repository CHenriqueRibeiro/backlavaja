const Service = require('../models/Service');
const Establishment = require('../models/Establishment');

exports.createService = async (req, res) => {
  const { name, description, price, duration, dailyLimit, availability } = req.body;
  const establishmentId = req.params.establishmentId; // ID do estabelecimento na URL

  try {
    // Verifica se o estabelecimento existe
    const establishment = await Establishment.findById(establishmentId);

    if (!establishment) {
      return res.status(404).json({ message: 'Estabelecimento não encontrado.' });
    }

    // Verifica se o dono do token (req.user.ownerId) é o dono do estabelecimento
    if (establishment.owner.toString() !== req.user.ownerId.toString()) {
      return res.status(403).json({ message: 'Você não tem permissão para criar um serviço neste estabelecimento.' });
    }

    // Criação do novo serviço dentro do array de services do estabelecimento
    const newService = {
      name,
      description,
      price,
      duration,
      dailyLimit,
      availability: availability.map(item => ({
        day: item.day, // Ex: "Segunda"
        availableHours: item.availableHours.map(hour => ({
          start: hour.start, // Ex: "08:00"
          end: hour.end, // Ex: "12:00"
        })),
      })),
    };

    // Adiciona o serviço ao estabelecimento e salva
    establishment.services.push(newService);
    await establishment.save();

    // Retorna a resposta com sucesso
    return res.status(201).json({
      message: 'Serviço criado com sucesso!',
      service: newService, // Retorna o serviço recém-criado
    });

  } catch (error) {
    console.log('Erro ao criar serviço:', error);
    return res.status(500).json({ message: 'Erro ao criar serviço.', error });
  }
};


exports.updateService = async (req, res) => {
  const { serviceId } = req.params;
  const { name, description, price, availableDays, availableHours } = req.body;

  try {
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Serviço não encontrado' });
    }

    // Verifica se o usuário autenticado é o dono do estabelecimento que tem esse serviço
    const establishment = await Establishment.findById(service.establishment);
    if (establishment.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Você não tem permissão para atualizar este serviço.' });
    }

    service.name = name || service.name;
    service.description = description || service.description;
    service.price = price || service.price;
    service.availableDays = availableDays || service.availableDays;
    service.availableHours = availableHours || service.availableHours;

    await service.save();

    return res.status(200).json({ message: 'Serviço atualizado com sucesso!', service });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao atualizar serviço.', error });
  }
};

  

exports.deleteService = async (req, res) => {
  const { serviceId } = req.params;

  try {
    const service = await Service.findById(serviceId);
    if (!service) {
      return res.status(404).json({ message: 'Serviço não encontrado!' });
    }

    // Verifica se o usuário autenticado é o dono do estabelecimento que tem esse serviço
    const establishment = await Establishment.findById(service.establishment);
    if (establishment.owner.toString() !== req.user._id.toString()) {
      return res.status(403).json({ message: 'Você não tem permissão para excluir este serviço.' });
    }

    // Remove o serviço do estabelecimento
    const establishmentUpdate = await Establishment.findOne({ services: serviceId });
    if (establishmentUpdate) {
      establishmentUpdate.services.pull(serviceId);
      await establishmentUpdate.save();
    }

    await service.remove();

    return res.status(200).json({ message: 'Serviço excluído com sucesso!' });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao excluir serviço.', error });
  }
};


  
exports.getAllServices = async (req, res) => {
  try {
    const services = await Service.find()
      .populate('establishment', 'name')
      .populate('owner', 'name');

    return res.status(200).json({ services });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao obter serviços.', error });
  }
};

exports.getServicesByEstablishment = async (req, res) => {
  const { establishmentId } = req.params;

  try {
    const establishment = await Establishment.findById(establishmentId);

    if (!establishment) {
      return res.status(404).json({ message: 'Estabelecimento não encontrado.' });
    }

    const services = establishment.services;

    if (!services || services.length === 0) {
      return res.status(404).json({ message: 'Nenhum serviço encontrado para este estabelecimento.' });
    }

    return res.status(200).json({ services });
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao obter serviços.', error });
  }
};
  
  