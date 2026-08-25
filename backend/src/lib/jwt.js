const jwt = require("jsonwebtoken");

const signToken = (user) =>
  jwt.sign({ sub: user.id }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

module.exports = { signToken, verifyToken };
