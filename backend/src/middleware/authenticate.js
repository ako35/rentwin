const prisma = require("../lib/prisma");
const { verifyToken, passwordStamp } = require("../lib/jwt");
const asyncHandler = require("./async-handler");

const authenticate = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const [scheme, token] = header.split(" ");

  if (scheme !== "Bearer" || !token) {
    return res.status(401).json({ message: "Not authenticated." });
  }

  let payload;
  try {
    payload = verifyToken(token);
  } catch (error) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  const user = await prisma.user.findUnique({ where: { id: payload.sub } });
  // A token signed before the account's last password change no longer
  // counts. Tokens from before the stamp existed carry none; they stay valid
  // until they expire (7 days) so nobody is logged out by the deploy.
  if (!user || (payload.pwd !== undefined && payload.pwd !== passwordStamp(user.passwordHash))) {
    return res.status(401).json({ message: "Invalid or expired token." });
  }

  const { passwordHash, ...safeUser } = user;
  req.user = safeUser;
  next();
});

module.exports = authenticate;
