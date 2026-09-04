const { Router } = require("express");
const { register, login } = require("./auth.controller");
const { authLimiter } = require("../../middleware/rate-limit");

const router = Router();

router.post("/register", authLimiter, register);
router.post("/login", authLimiter, login);

module.exports = router;
