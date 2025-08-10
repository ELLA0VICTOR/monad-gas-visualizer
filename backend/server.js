import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import gasRoutes from "./routes/gasRoutes.js";
import rateLimit from "express-rate-limit";
import helmet from "helmet";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// security headers
app.use(helmet());

// CORS
app.use(cors());

// allow large pasted/zip uploads (tweak as needed)
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: true, limit: "50mb" }));

// basic rate limiter (protect compile endpoint from abuse)
const limiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minute
  max: 10, // limit each IP to 10 requests per windowMs (tweak)
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/compile-and-estimate", limiter);

// routes
app.use("/api", gasRoutes);

app.get("/", (req, res) => {
  res.send("✅ Monad Gas Estimator Backend is running!");
});

// create server so we can set timeout
const server = app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});

// allow longer-running compiles (be cautious in production)
server.setTimeout(5 * 60 * 1000); // 5 minutes
