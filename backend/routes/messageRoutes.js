const express = require("express");
const router = express.Router();
const { getRoomMessages } = require("../controllers/messageController");
const { protect } = require("../middleware/authMiddleware");

router.get("/:room", protect, getRoomMessages);

module.exports = router;
