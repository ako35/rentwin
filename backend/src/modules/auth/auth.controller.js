const prisma = require("../../lib/prisma");
const HttpError = require("../../lib/http-error");
const { hashPassword, comparePassword } = require("../../lib/password");
const { signToken } = require("../../lib/jwt");
const asyncHandler = require("../../middleware/async-handler");

const register = asyncHandler(async (req, res) => {
  const { firstName, lastName, email, phoneNumber, address, zipCode, password } = req.body;

  if (!firstName || !lastName || !email || !password) {
    throw new HttpError(400, "Missing required fields.");
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    throw new HttpError(409, "An account with this email already exists.");
  }

  const passwordHash = await hashPassword(password);

  await prisma.user.create({
    data: {
      firstName,
      lastName,
      email,
      phoneNumber,
      address,
      zipCode: String(zipCode),
      passwordHash,
      roles: ["Customer"],
      builtIn: false,
    },
  });

  res.status(201).json({ message: "Registration successful." });
});

const login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    throw new HttpError(401, "Invalid email or password.");
  }

  const valid = await comparePassword(password || "", user.passwordHash);
  if (!valid) {
    throw new HttpError(401, "Invalid email or password.");
  }

  res.json({ token: signToken(user) });
});

module.exports = { register, login };
