import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Server working"
  });
});

// TEST ONLY ONE IMPORT
import userRoutes from "./src/routes/userRoutes.js";

app.use("/api/users", userRoutes);

export default app;