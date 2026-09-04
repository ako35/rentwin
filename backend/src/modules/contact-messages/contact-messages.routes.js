const { Router } = require("express");
const authenticate = require("../../middleware/authenticate");
const requireAdmin = require("../../middleware/require-admin");
const { publicWriteLimiter } = require("../../middleware/rate-limit");
const { sendMessage, getMessagesByPage, getMessage, deleteMessage } = require("./contact-messages.controller");

const router = Router();

router.post("/contactmessage/visitors", publicWriteLimiter, sendMessage);
router.get("/contactmessage/pages", authenticate, requireAdmin, getMessagesByPage);
router.get("/contactmessage/:id", authenticate, requireAdmin, getMessage);
router.delete("/contactmessage/:id", authenticate, requireAdmin, deleteMessage);

module.exports = router;
