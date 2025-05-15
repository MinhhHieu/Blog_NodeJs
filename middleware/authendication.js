const jwt = require('jsonwebtoken');
const secretKey = 'your-secret-key';

const authenticateToken = (req, res, next) => {
  // lấy token từ cookie
  const token = req.cookies.token;
  if (token) {
    // hàm kiểm tra token có hợp lệ không
    jwt.verify(token, secretKey, (err, decoded) => {
      if (err) {
        return res.sendStatus(403); 
      }
      // decoded truy cập thông tin user đã được mã hóa trong token
      req.userId = decoded.userId;
      next();
    });
  } else {
    res.redirect("/login"); 
  }
};

module.exports = authenticateToken;