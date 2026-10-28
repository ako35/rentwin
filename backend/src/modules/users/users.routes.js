const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const {
  getCurrentUser,
  updateCurrentUser,
  changePassword,
  getUserAdmin,
  getUsersByPageAdmin,
  createUserAdmin,
  updateUserAdmin,
  deleteUserAdmin,
} = require("./users.controller");

const router = Router();

router.get("/user", authenticate, getCurrentUser);
router.put("/user", authenticate, updateCurrentUser);
router.patch("/user/auth", authenticate, changePassword);

router.get("/user/auth/pages", authenticate, requireAdmin, getUsersByPageAdmin);
router.post("/user/auth", authenticate, requireAdmin, createUserAdmin);
router.get("/user/:id/auth", authenticate, requireAdmin, getUserAdmin);
router.put("/user/:id/auth", authenticate, requireAdmin, updateUserAdmin);
router.delete("/user/:id/auth", authenticate, requireAdmin, deleteUserAdmin);

module.exports = router;
