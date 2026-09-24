require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");
const { requireSharedSecret } = require("./auth");
const { router: kabisRouter, kabisErrorHandler } = require("./routes/kabis.routes");

const app = express();

app.set("trust proxy", 1); // Nginx reverse proxy arkasında çalışır.

app.use(helmet());

const allowedOrigin = process.env.ALLOWED_ORIGIN || "";
app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === allowedOrigin) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
  })
);

app.use(express.json());

// Deploy sonrası "ayakta mı" kontrolü için — kimlik doğrulama gerektirmez.
app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use(requireSharedSecret);
app.use(kabisRouter);
app.use(kabisErrorHandler);

app.use((req, res) => res.status(404).json({ error: "Bulunamadı." }));

module.exports = app;
