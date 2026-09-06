const jwt = require("jsonwebtoken");
const User = require("../models/User");

// REST middleware
const protect = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith("Bearer ")) {
    try {
      const token = authHeader.split(" ")[1];
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      req.user = await User.findById(decoded.id).select("-password");

      if (!req.user) {
        return res.status(401).json({ message: "User not found" });
      }
      return next();
    } catch (error) {
      return res.status(401).json({ message: "Not authorized, invalid token" });
    }
  }
  return res.status(401).json({ message: "Not authorized, no token provided" });
};

// Shared helper used by socket auth (not a middleware, just a verify+lookup fn)
const verifyTokenAndGetUser = async (token) => {
  const decoded = jwt.verify(token, process.env.JWT_SECRET);
  const user = await User.findById(decoded.id).select("-password");
  if (!user) throw new Error("User not found");
  return user;
};

module.exports = { protect, verifyTokenAndGetUser };
