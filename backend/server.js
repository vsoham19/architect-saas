import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.supabase_url,
  process.env.supabase_key
);

dotenv.config();
const app = express();

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    status: "ok",
    message: "Server + CORS working"
  });
});

export default app;