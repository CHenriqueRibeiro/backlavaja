const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const Owner = require("../models/Owner");

const SECRET_KEY = process.env.SECRET_KEY;

const loginOwner = async (req, res) => {
  const { email, password } = req.body;

  if (!SECRET_KEY) {
    return res
      .status(500)
      .json({ message: "Erro interno: Chave secreta não configurada" });
  }

  try {
    const owner = await Owner.findOne({ email });
    if (!owner) {
      return res.status(400).json({ message: "Dono não encontrado!" });
    }

    const isPasswordValid = await bcrypt.compare(password, owner.password);
    if (!isPasswordValid) {
      return res.status(400).json({ message: "Senha incorreta!" });
    }

    const token = jwt.sign({ ownerId: owner._id }, SECRET_KEY, {
      expiresIn: "1h",
    });

    console.log("Owner data:", owner);

    res.json({
      message: "Login bem-sucedido!",
      token,
      owner: {
        id: owner._id,
        email: owner.email,
        name: owner.name,
      },
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: "Erro no servidor!" });
  }
};

module.exports = { loginOwner };
