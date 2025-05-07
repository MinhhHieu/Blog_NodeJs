const jwt = require('jsonwebtoken');
const secretKey = 'your-secret-key';

const authenticateToken = (req, res, next) => {
  const token = req.cookies.token;
  if (token) {
    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        return res.sendStatus(403); // Invalid token
      }
      req.userId = decoded.userId;
      next();
    });
  } else {
    res.redirect("/login"); // Not authenticated, redirect to login page
  }
};

module.exports = authenticateToken;