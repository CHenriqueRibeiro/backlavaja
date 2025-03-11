const Owner = require('../models/Owner');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const SECRET_KEY = process.env.SECRET_KEY;

exports.registerOwner = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    const existingOwner = await Owner.findOne({ email });
    if (existingOwner) {
      return res.status(400).json({ message: 'Dono já cadastrado' });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newOwner = new Owner({
      name,
      email,
      phone,
      password: hashedPassword,
      establishments: [],
    });

    await newOwner.save();

    const token = jwt.sign({ id: newOwner._id }, SECRET_KEY, { expiresIn: '1h' });

    res.status(201).json({
      owner: {
        id: newOwner._id,
        name: newOwner.name,
        email: newOwner.email,
        phone: newOwner.phone
      },
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Erro ao criar o dono' });
  }
};