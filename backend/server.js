import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

// ROUTES
import userRoutes from "./src/routes/userRoutes.js";
import projectRoutes from "./src/routes/projectRoutes.js";
import taskRoutes from "./src/routes/taskRoutes.js";
import documentRoutes from "./src/routes/documentRoutes.js";
import notificationRoutes from "./src/routes/notificationRoutes.js";
import auditRoutes from "./src/routes/auditRoutes.js";

// MIDDLEWARE
import { errorHandler } from "./src/middleware/error.js";

dotenv.config();

const app = express();

// ======================
// MIDDLEWARE
// ======================

app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PATCH", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "apikey"]
}));

app.use(express.json());

// ======================
// SUPABASE
// ======================

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);

// ======================
// HEALTH ROUTES
// ======================

app.get("/", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Backend running successfully"
  });
});

app.get("/api/health", (req, res) => {
  res.status(200).json({
    status: "ok",
    message: "Backend running successfully"
  });
});

// ======================
// API ROUTES
// ======================

app.use("/api/users", userRoutes);
app.use("/api/projects", projectRoutes);
app.use("/api/tasks", taskRoutes);
app.use("/api/documents", documentRoutes);
app.use("/api/notifications", notificationRoutes);
app.use("/api/audit-logs", auditRoutes);

// ======================
// ERROR HANDLER
// ======================

app.use(errorHandler);

// ======================
// EXPORT FOR VERCEL
// ======================

export default app;