const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ msg: "Acesso negado. Token não fornecido." });
  }

  try {
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded;

    console.log('Token decodificado:', decoded);

    next();
  } catch (error) {
    console.error('Erro ao verificar o token:', error);
    res.status(400).json({ msg: "Token inválido", error: error.message });
  }
};

module.exports = authMiddleware;
