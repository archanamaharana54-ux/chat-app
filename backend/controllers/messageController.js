const Message = require("../models/Message");

// @desc Get messages for a room (paginated, latest first then reversed for display)
// @route GET /api/messages/:room
const getRoomMessages = async (req, res, next) => {
  try {
    const { room } = req.params;
    const { page = 1, limit = 30 } = req.query;

    const messages = await Message.find({ room })
      .sort({ createdAt: -1 })
      .skip((Number(page) - 1) * Number(limit))
      .limit(Number(limit));

    // reverse so oldest-first for chat display
    res.json(messages.reverse());
  } catch (error) {
    next(error);
  }
};

module.exports = { getRoomMessages };
