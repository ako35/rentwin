require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./modules/auth/auth.routes");
const usersRoutes = require("./modules/users/users.routes");
const vehiclesRoutes = require("./modules/vehicles/vehicles.routes");
const vehicleRecordsRoutes = require("./modules/vehicle-records/vehicle-records.routes");
const filesRoutes = require("./modules/files/files.routes");
const reservationsRoutes = require("./modules/reservations/reservations.routes");
const contractsRoutes = require("./modules/contracts/contracts.routes");
const contractRecordsRoutes = require("./modules/contract-records/contract-records.routes");
const contactMessagesRoutes = require("./modules/contact-messages/contact-messages.routes");
const excelRoutes = require("./modules/excel/excel.routes");
const branchesRoutes = require("./modules/branches/branches.routes");
const locationsRoutes = require("./modules/locations/locations.routes");
const corporatesRoutes = require("./modules/corporates/corporates.routes");
const extrasRoutes = require("./modules/extras/extras.routes");
const announcementsRoutes = require("./modules/announcements/announcements.routes");
const notFound = require("./middleware/not-found");
const errorHandler = require("./middleware/error-handler");

const app = express();

// Behind Vercel's single proxy layer — needed for correct client IPs
// (rate limiting) and for `req.protocol`/HSTS.
app.set("trust proxy", 1);

// Security headers. CSP is left to the frontend host (the SPA is served
// separately by Vercel); CORP is relaxed so cross-origin <img> from /api/files
// keeps working (e.g. local dev on a different port).
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
    crossOriginResourcePolicy: { policy: "cross-origin" },
  })
);

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

// Mounted under /api so this app can be deployed alongside the frontend in a
// single Vercel project (api/index.js at the repo root) without route
// collisions against SPA paths like /user or /auth/login.
const api = express.Router();

api.get("/health", (req, res) => res.json({ status: "ok" }));

api.use(authRoutes);
api.use(usersRoutes);
api.use(vehiclesRoutes);
api.use(vehicleRecordsRoutes);
api.use(filesRoutes);
api.use(reservationsRoutes);
api.use(contractsRoutes);
api.use(contractRecordsRoutes);
api.use(contactMessagesRoutes);
api.use(excelRoutes);
api.use(branchesRoutes);
api.use(locationsRoutes);
api.use(corporatesRoutes);
api.use(extrasRoutes);
api.use(announcementsRoutes);

app.use("/api", api);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
