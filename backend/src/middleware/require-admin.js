const requireAdmin = (req, res, next) => {
  if (!req.user?.roles?.includes("Administrator")) {
    return res.status(403).json({ message: "Administrator access required." });
  }
  next();
};

module.exports = requireAdmin;
