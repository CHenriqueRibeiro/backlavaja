const jwt = require('jsonwebtoken');

const verifyToken = (req, res, next) => {
  const token = req.headers['Authorization'];

  if (!token) {
    return res.status(403).json({ message: 'Token não fornecido.' });
  }

  const tokenWithoutBearer = token.replace('Bearer ', '');

  jwt.verify(tokenWithoutBearer, process.env.SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: 'Token inválido', error: err });
    }

    req.user = decoded;
    next();
  });
};

module.exports = verifyToken;
