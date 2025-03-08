// authMiddleware/authenticateToken.js
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const token = req.header('Authorization') && req.header('Authorization').replace('Bearer ', '');

  if (!token) {
    return res.status(403).json({ message: 'Token não encontrado. Acesso negado.' });
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET); // Verificando o token usando a chave secreta
    req.user = decoded; // Adiciona o usuário decodificado ao objeto req
    next(); // Passa para a próxima função
  } catch (error) {
    return res.status(401).json({ message: 'Token inválido.' });
  }
}

module.exports = authenticateToken;
