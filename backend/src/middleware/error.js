export const errorHandler = (err, req, res, next) => {
  console.error("Express Error Handler Captured Exception:", err);
  const status = err.statusCode || 500;
  const message = err.message || "Internal Server Error";
  res.status(status).json({
    status: "error",
    statusCode: status,
    message
  });
};
