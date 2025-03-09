const jwt = require('jsonwebtoken');

const authMiddleware = (req, res, next) => {
  const token = req.header("Authorization")?.replace('Bearer ', '');

  if (!token) {
    return res.status(401).json({ msg: "Acesso negado. Token não fornecido." });
  }

  try {
    // Decodificando o token e extraindo o ownerId
    const decoded = jwt.verify(token, process.env.SECRET_KEY);
    req.user = decoded;  // O decoded agora terá o ownerId

    console.log('Token decodificado:', decoded); // Log para ver o conteúdo do JWT

    next(); // Passa para a próxima função/middleware
  } catch (error) {
    console.error('Erro ao verificar o token:', error);
    res.status(400).json({ msg: "Token inválido", error: error.message });
  }
};

module.exports = authMiddleware;
