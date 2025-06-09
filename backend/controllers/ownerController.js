const Owner = require("../models/Owner");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const fetch = require("node-fetch");

const SECRET_KEY = process.env.SECRET_KEY;
const N8N_WEBHOOK_URL_RESET = process.env.N8N_WEBHOOK_URL_RESET;
const N8N_WEBHOOK_URL_UPDATE_PASSWORD =
  process.env.N8N_WEBHOOK_URL_UPDATE_PASSWORD;

exports.registerOwner = async (req, res) => {
  const { name, email, password, phone } = req.body;

  try {
    const existingOwner = await Owner.findOne({ email });
    if (existingOwner) {
      return res.status(400).json({ message: "Email já cadastrado" });
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

    const token = jwt.sign({ id: newOwner._id }, SECRET_KEY, {
      expiresIn: "1h",
    });

    res.status(201).json({
      owner: {
        id: newOwner._id,
        name: newOwner.name,
        email: newOwner.email,
        phone: newOwner.phone,
      },
      token,
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro ao criar o dono" });
  }
};

exports.resetPassword = async (req, res) => {
  const { ownerId } = req.params;
  const { oldPassword, newPassword } = req.body;

  if (!oldPassword || !newPassword) {
    return res
      .status(400)
      .json({ message: "Senha antiga e nova são obrigatórias." });
  }

  try {
    const owner = await Owner.findById(ownerId);
    if (!owner) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const isPasswordValid = await bcrypt.compare(oldPassword, owner.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Senha antiga incorreta." });
    }

    const salt = await bcrypt.genSalt(10);
    owner.password = await bcrypt.hash(newPassword, salt);
    await owner.save();

    res.status(200).json({ message: "Senha redefinida com sucesso!" });
  } catch (error) {
    console.error("Erro ao redefinir senha:", error);
    res.status(500).json({ message: "Erro no servidor." });
  }
};

exports.forgotPassword = async (req, res) => {
  const { email } = req.body;

  if (!email) {
    return res.status(400).json({ message: "E-mail é obrigatório." });
  }

  try {
    const owner = await Owner.findOne({ email });
    if (!owner) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const token = jwt.sign({ ownerId: owner._id }, SECRET_KEY, {
      expiresIn: "1h",
    });

    const resetLink = `https://adminlavaja.vercel.app/redefinir-senha/${token}`;
    await fetch(N8N_WEBHOOK_URL_RESET, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: owner.name,
        email: owner.email,
        resetLink,
      }),
    });

    res.status(200).json({ message: "E-mail enviado!" });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro no servidor." });
  }
};

exports.resetPasswordToken = async (req, res) => {
  const { token } = req.params;
  const { newPassword } = req.body;

  if (!newPassword) {
    return res.status(400).json({ message: "Nova senha é obrigatória." });
  }

  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    const owner = await Owner.findById(decoded.ownerId);
    if (!owner) {
      return res.status(404).json({ message: "Usuário não encontrado." });
    }

    const salt = await bcrypt.genSalt(10);
    owner.password = await bcrypt.hash(newPassword, salt);
    owner.isTemporaryPassword = false;
    await owner.save();

    await fetch(N8N_WEBHOOK_URL_UPDATE_PASSWORD, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        nome: owner.name,
        email: owner.email,
      }),
    });

    res.status(200).json({ message: "Senha redefinida com sucesso!" });
  } catch (error) {
    console.error("Erro ao redefinir senha via token:", error);
    res.status(400).json({ message: "Token inválido ou expirado." });
  }
};
