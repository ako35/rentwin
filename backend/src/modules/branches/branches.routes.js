const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const { getAllBranches, createBranch, updateBranch, deleteBranch } = require("./branches.controller");

const router = Router();

router.get("/branches/admin/auth", authenticate, requireAdmin, getAllBranches);
router.post("/branches/admin/auth", authenticate, requireAdmin, createBranch);
router.put("/branches/admin/:id/auth", authenticate, requireAdmin, updateBranch);
router.delete("/branches/admin/:id/auth", authenticate, requireAdmin, deleteBranch);

module.exports = router;
