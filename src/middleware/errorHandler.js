module.exports = function errorHandler(err, req, res, next) {
  const s = err.status || 500;
  res.status(s).json({ message: err.message || "Server Error" });
};
