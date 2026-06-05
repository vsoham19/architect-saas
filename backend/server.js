import express from "express";

const app = express();

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Minimal server working"
  });
});

export default app;