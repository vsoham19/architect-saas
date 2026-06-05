import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Core backend working"
  });
});

// ===== TEST ROUTES ONE BY ONE =====

try {
  const userRoutes = (await import("./src/routes/userRoutes.js")).default;
  app.use("/api/users", userRoutes);
  console.log("✅ userRoutes loaded");
} catch (err) {
  console.error("❌ userRoutes failed:", err);
}

try {
  const projectRoutes = (await import("./src/routes/projectRoutes.js")).default;
  app.use("/api/projects", projectRoutes);
  console.log("✅ projectRoutes loaded");
} catch (err) {
  console.error("❌ projectRoutes failed:", err);
}

try {
  const taskRoutes = (await import("./src/routes/taskRoutes.js")).default;
  app.use("/api/tasks", taskRoutes);
  console.log("✅ taskRoutes loaded");
} catch (err) {
  console.error("❌ taskRoutes failed:", err);
}

try {
  const documentRoutes = (await import("./src/routes/documentRoutes.js")).default;
  app.use("/api/documents", documentRoutes);
  console.log("✅ documentRoutes loaded");
} catch (err) {
  console.error("❌ documentRoutes failed:", err);
}

try {
  const notificationRoutes = (await import("./src/routes/notificationRoutes.js")).default;
  app.use("/api/notifications", notificationRoutes);
  console.log("✅ notificationRoutes loaded");
} catch (err) {
  console.error("❌ notificationRoutes failed:", err);
}

try {
  const auditRoutes = (await import("./src/routes/auditRoutes.js")).default;
  app.use("/api/audit-logs", auditRoutes);
  console.log("✅ auditRoutes loaded");
} catch (err) {
  console.error("❌ auditRoutes failed:", err);
}

export default app;