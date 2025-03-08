const jwt = require("jsonwebtoken");

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization");

  if (!token) {
    return res.status(401).json({ msg: "Acesso negado. Token não fornecido." });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.owner = decoded.id;
    next();
  } catch (error) {
    res.status(400).json({ msg: "Token inválido" });
  }
};

module.exports = authMiddleware;
