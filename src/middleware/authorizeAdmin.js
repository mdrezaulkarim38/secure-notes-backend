module.exports = function authorizeAdmin(req, res, next) {
  if (!req.user || req.user.role !== "Admin")
    return res.status(403).json({ message: "Admin only" });
  next();
};
