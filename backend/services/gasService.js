import { ethers } from "ethers";
import solc from "solc";
import os from "os";

/**
 * Estimates gas for given transaction data.
 */
export async function estimateGas({ rpcUrl, to, data }) {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const gasEstimate = await provider.estimateGas({
      to,
      data,
    });

    return gasEstimate.toString();
  } catch (err) {
    console.error("Gas estimation failed:", err);
    throw new Error("Gas estimation failed");
  }
}

/**
 * Handles plain gas estimation (no compilation).
 */
export async function estimateGasHandler(req, res) {
  const { to, data, chain } = req.body;

  if (!to || !data) {
    return res.status(400).json({ error: "Missing 'to' or 'data'" });
  }

  try {
    const rpcUrl =
      chain === "ethereum"
        ? process.env.ETHEREUM_RPC_URL
        : process.env.MONAD_RPC_URL;

    const gasUsed = await estimateGas({ rpcUrl, to, data });
    res.json({ gasUsed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Compiles Solidity source and estimates gas for deployment.
 * Also returns compilation speed & parallelism metrics.
 */
export async function compileAndEstimateHandler(req, res) {
  const { sourceCode, chain } = req.body;

  if (!sourceCode) {
    return res.status(400).json({ error: "Missing Solidity source code" });
  }

  try {
    const cpuCount = os.cpus().length; // Approximate parallelism

    // 1. Compile with solc and measure time
    const startCompile = Date.now();

    const input = {
      language: "Solidity",
      sources: { "Contract.sol": { content: sourceCode } },
      settings: { outputSelection: { "*": { "*": ["abi", "evm.bytecode"] } } },
    };

    const output = JSON.parse(solc.compile(JSON.stringify(input)));

    const endCompile = Date.now();
    const compileTimeMs = endCompile - startCompile;

    if (output.errors && output.errors.length) {
      const fatalErrors = output.errors.filter(e => e.severity === "error");
      if (fatalErrors.length) {
        return res.status(400).json({ error: "Compilation failed", details: fatalErrors });
      }
    }

    const contractName = Object.keys(output.contracts["Contract.sol"])[0];
    const bytecode = output.contracts["Contract.sol"][contractName].evm.bytecode.object;

    if (!bytecode) {
      return res.status(500).json({ error: "No bytecode generated" });
    }

    // 2. Estimate gas for deployment
    const rpcUrl =
      chain === "ethereum"
        ? process.env.ETHEREUM_RPC_URL
        : process.env.MONAD_RPC_URL;

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const gasEstimate = await provider.estimateGas({
      data: "0x" + bytecode,
    });

    // Rough gas/sec metric
    const gasPerSecond = (Number(gasEstimate) / (compileTimeMs / 1000)).toFixed(2);

    res.json({
      contractName,
      abi: output.contracts["Contract.sol"][contractName].abi,
      gasUsed: gasEstimate.toString(),
      metrics: {
        compileTimeMs,
        parallelism: cpuCount,
        gasPerSecond,
      },
    });
  } catch (error) {
    console.error("Compilation or estimation error:", error);
    res.status(500).json({ error: error.message });
  }
}
