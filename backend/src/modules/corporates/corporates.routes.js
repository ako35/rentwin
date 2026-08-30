const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const {
  listCorporates,
  getCorporate,
  createCorporate,
  updateCorporate,
  deleteCorporate,
} = require("./corporates.controller");

const router = Router();

router.get("/corporates/admin/auth", authenticate, requireAdmin, listCorporates);
router.get("/corporates/admin/:id/auth", authenticate, requireAdmin, getCorporate);
router.post("/corporates/admin/auth", authenticate, requireAdmin, createCorporate);
router.put("/corporates/admin/:id/auth", authenticate, requireAdmin, updateCorporate);
router.delete("/corporates/admin/:id/auth", authenticate, requireAdmin, deleteCorporate);

module.exports = router;
