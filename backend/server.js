import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import gasRoutes from "./routes/gasRoutes.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());


app.use("/api", gasRoutes);


app.get("/", (req, res) => {
  res.send("✅ Monad Gas Estimator Backend is running!");
});


app.listen(PORT, () => {
  console.log(`✅ Backend running on port ${PORT}`);
});
