const jwt = require("jsonwebtoken");
const { createHash } = require("crypto");

// Short fingerprint of the account's password hash, carried in every token.
// bcrypt re-salts on each change, so a new password changes the fingerprint
// and every token issued before it stops working (authenticate.js compares).
const passwordStamp = (passwordHash) =>
  createHash("sha256").update(String(passwordHash || "")).digest("base64url").slice(0, 16);

const signToken = (user) =>
  jwt.sign({ sub: user.id, pwd: passwordStamp(user.passwordHash) }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRES_IN || "7d",
  });

const verifyToken = (token) => jwt.verify(token, process.env.JWT_SECRET);

module.exports = { signToken, verifyToken, passwordStamp };
