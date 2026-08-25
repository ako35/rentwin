const HttpError = require("../lib/http-error");

// eslint-disable-next-line no-unused-vars
const errorHandler = (err, req, res, next) => {
  if (err instanceof HttpError) {
    return res.status(err.status).json({ message: err.message });
  }

  if (err.code === "P2002") {
    return res.status(409).json({ message: "A record with this value already exists." });
  }

  if (err.code === "P2003" || err.code === "P2025") {
    return res.status(409).json({ message: "This action conflicts with related records." });
  }

  if (err.name === "MulterError") {
    return res.status(400).json({ message: err.message });
  }

  console.error(err);
  res.status(500).json({ message: "Internal server error." });
};

module.exports = errorHandler;
