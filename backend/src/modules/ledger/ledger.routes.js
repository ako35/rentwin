const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const { getUserLedger, createEntry, updateEntry, deleteEntry } = require("./ledger.controller");

const router = Router();

router.get("/ledger/admin/:userId/auth", authenticate, requireAdmin, getUserLedger);
router.post("/ledger/admin/auth", authenticate, requireAdmin, createEntry);
router.put("/ledger/admin/:id/auth", authenticate, requireAdmin, updateEntry);
router.delete("/ledger/admin/:id/auth", authenticate, requireAdmin, deleteEntry);

module.exports = router;
