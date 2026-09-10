require("dotenv").config();

const express = require("express");
const cors = require("cors");
const helmet = require("helmet");

const authRoutes = require("./modules/auth/auth.routes");
const usersRoutes = require("./modules/users/users.routes");
const vehiclesRoutes = require("./modules/vehicles/vehicles.routes");
const vehicleModelImagesRoutes = require("./modules/vehicle-model-images/vehicle-model-images.routes");
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
const campaignsRoutes = require("./modules/campaigns/campaigns.routes");
const ledgerRoutes = require("./modules/ledger/ledger.routes");
const settingsRoutes = require("./modules/settings/settings.routes");
const { getSitemap } = require("./modules/sitemap/sitemap.controller");
const { renderPage } = require("./modules/prerender/prerender.controller");
const { purgeSoldVehicles } = require("./modules/maintenance/purge.controller");
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

// Scheduled maintenance (Vercel Cron -> vercel.json "crons"). Secret-gated
// inside the handler.
api.get("/cron/purge-sold-vehicles", purgeSoldVehicles);

api.use(authRoutes);
api.use(usersRoutes);
api.use(vehiclesRoutes);
api.use(vehicleModelImagesRoutes);
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
api.use(campaignsRoutes);
api.use(ledgerRoutes);
api.use(settingsRoutes);

app.use("/api", api);

// Served at the site root (see vercel.json rewrite) so search engines find it
// at https://rentwin.com.tr/sitemap.xml.
app.get("/sitemap.xml", getSitemap);

// Bot prerender. vercel.json routes only crawler/social user-agents on these
// paths here; human browsers keep getting the static SPA shell untouched.
app.get(
  [
    "/vehicles",
    "/vehicles/:id",
    "/lokasyonlar",
    "/lokasyonlar/:slug",
    "/kampanyalar",
    "/about",
    "/contact",
    "/sss",
    "/privacy-policy",
  ],
  renderPage
);

app.use(notFound);
app.use(errorHandler);

module.exports = app;
