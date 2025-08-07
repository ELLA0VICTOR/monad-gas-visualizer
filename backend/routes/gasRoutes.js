import express from "express";
import { estimateGasHandler, compileAndEstimateHandler } from "../services/gasService.js";

const router = express.Router();

// Existing gas estimation route
router.post("/estimate-gas", estimateGasHandler);

// New compilation + gas estimation route
router.post("/compile-and-estimate", compileAndEstimateHandler);

export default router;
