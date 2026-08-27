require("dotenv").config();

const express = require("express");
const cors = require("cors");

const authRoutes = require("./modules/auth/auth.routes");
const usersRoutes = require("./modules/users/users.routes");
const vehiclesRoutes = require("./modules/vehicles/vehicles.routes");
const filesRoutes = require("./modules/files/files.routes");
const reservationsRoutes = require("./modules/reservations/reservations.routes");
const contactMessagesRoutes = require("./modules/contact-messages/contact-messages.routes");
const excelRoutes = require("./modules/excel/excel.routes");
const branchesRoutes = require("./modules/branches/branches.routes");
const announcementsRoutes = require("./modules/announcements/announcements.routes");
const notFound = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");

const app = express();

const allowedOrigins = (process.env.CORS_ORIGIN || "")
  .split(",")
  .map((origin) => origin.trim())
  .filter(Boolean);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) return callback(null, true);
      return callback(new Error("Not allowed by CORS"));
    },
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

app.use(express.json());

app.get("/health", (req, res) => res.json({ status: "ok" }));

app.use(authRoutes);
app.use(usersRoutes);
app.use(vehiclesRoutes);
app.use(filesRoutes);
app.use(reservationsRoutes);
app.use(contactMessagesRoutes);
app.use(excelRoutes);
app.use(branchesRoutes);
app.use(announcementsRoutes);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
