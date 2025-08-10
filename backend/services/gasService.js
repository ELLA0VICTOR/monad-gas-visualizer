// services/gasService.js
import { ethers } from "ethers";
import solc from "solc";
import os from "os";

const DEFAULT_SOLC_MAPPING = {
  "0.8": "v0.8.20+commit.0bbfe453",
  "0.7": "v0.7.6+commit.7338295f",
  "0.6": "v0.6.12+commit.27d51765",
  "0.5": "v0.5.17+commit.d19bba13",
  "0.4": "v0.4.26+commit.4563c3fc",
};

/**
 * Utility: fetch with fallback to node global fetch. Node 18+ is recommended.
 */
async function httpGet(url) {
  if (typeof fetch === "function") {
    const res = await fetch(url);
    if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.status}`);
    return await res.text();
  } else {
    throw new Error("No fetch available. Use Node 18+ or install node-fetch/axios.");
  }
}

/**
 * Find import strings in a solidity source.
 */
function findImportsFromSource(source) {
  const re = /import\s+["']([^"']+)["']/g;
  const imports = [];
  let m;
  while ((m = re.exec(source)) !== null) {
    imports.push(m[1]);
  }
  return imports;
}

/**
 * Simple resolver for external imports:
 * - absolute http(s) -> fetch directly
 * - npm / package imports (e.g. @openzeppelin/..., openzeppelin/...) -> try unpkg
 * - relative imports -> must be provided inside sources map (or we try to normalize)
 */
async function fetchImportContent(importPath, parentFilename = "") {
  // remote http(s)
  if (/^https?:\/\//i.test(importPath)) {
    return await httpGet(importPath);
  }

  // relative import (./ or ../)
  if (importPath.startsWith("./") || importPath.startsWith("../")) {
    // Caller should add relative imports to sources map; signal missing if not found
    throw new Error(`Relative import not provided in sources: ${importPath} (from ${parentFilename})`);
  }

  // try unpkg: identify package and path
  // e.g. '@openzeppelin/contracts/token/ERC20/ERC20.sol'
  // package = '@openzeppelin/contracts', rest = 'token/ERC20/ERC20.sol'
  let packageName, restPath;
  if (importPath.startsWith("@")) {
    // scoped
    const parts = importPath.split("/");
    packageName = parts.slice(0, 2).join("/");
    restPath = parts.slice(2).join("/");
  } else {
    const parts = importPath.split("/");
    packageName = parts[0];
    restPath = parts.slice(1).join("/");
  }

  const tryUrls = [
    // unpkg with @latest
    `https://unpkg.com/${packageName}@latest/${restPath}`,
    // fallback to unpkg without explicit @latest (sometimes works)
    `https://unpkg.com/${packageName}/${restPath}`,
    // GitHub raw for OpenZeppelin common case
    `https://raw.githubusercontent.com/${packageName}/master/${restPath}`,
  ];

  let lastErr;
  for (const u of tryUrls) {
    try {
      return await httpGet(u);
    } catch (e) {
      lastErr = e;
    }
  }

  throw new Error(`Failed to fetch import ${importPath}: ${lastErr?.message || "unknown"}`);
}

/**
 * Given a sources map (filename -> { content }), recursively resolve imports and return a completed sources map.
 * - sources may be { "A.sol": { content: "..." }, ... } OR if only single source provided, it's converted to "Contract.sol"
 */
export async function resolveAllImports(initialSources) {
  // clone
  const sources = { ...initialSources };
  const MAX_ITER = 20;
  for (let iter = 0; iter < MAX_ITER; iter++) {
    let added = false;
    // iterate over sources and find imports that aren't present
    const filenames = Object.keys(sources);
    for (const fname of filenames) {
      const content = sources[fname].content;
      const imports = findImportsFromSource(content);
      for (const imp of imports) {
        // skip if already resolved
        // normalize a key for non-relative remote imports to the import path string
        const key = imp;
        if (sources[key]) continue;

        // Relative imports inside same provided package: check for path relative to fname
        if (imp.startsWith("./") || imp.startsWith("../")) {
          const baseDir = fname.includes("/") ? fname.substring(0, fname.lastIndexOf("/")) : "";
          const resolved = baseDir ? `${baseDir}/${imp}` : imp.replace(/^.\//, "");
          if (sources[resolved]) continue; // if user already gave it
          // If user did not provide the relative file, try to throw a helpful error
          throw new Error(`Missing relative import file: ${imp} referenced from ${fname}. Provide it in 'sources' map as filename: "${resolved}".`);
        }

        // fetch external import
        try {
          const remoteContent = await fetchImportContent(imp, fname);
          sources[key] = { content: remoteContent };
          added = true;
        } catch (e) {
          // rethrow with context
          throw new Error(`Failed to resolve import "${imp}" from "${fname}": ${e.message}`);
        }
      }
    }

    if (!added) break;
    if (iter === MAX_ITER - 1) throw new Error("Import resolution exceeded max iterations");
  }

  return sources;
}

/**
 * Read the pragma lines across provided sources and pick a solc version.
 * Returns a version string usable by solc.loadRemoteVersion if we can map it.
 */
function pickSolcVersionFromPragma(sources) {
  const pragmaRe = /pragma\s+solidity\s+([^;]+);/;
  for (const fname of Object.keys(sources)) {
    const content = sources[fname].content;
    const m = pragmaRe.exec(content);
    if (m) {
      const token = m[1].trim(); // like ^0.8.0 || >=0.6.0 <0.8.0
      // try to extract major.minor like 0.8 or 0.7
      const verMatch = token.match(/(\d+\.\d+)/);
      if (verMatch) {
        const short = verMatch[1].split(".").slice(0, 2).join("."); // "0.8"
        if (DEFAULT_SOLC_MAPPING[short]) return DEFAULT_SOLC_MAPPING[short];
      }
    }
  }
  // default fallback if no pragma found or not mapped
  return DEFAULT_SOLC_MAPPING["0.8"];
}

/**
 * Wrapper to load remote solc version if possible, with a short timeout fallback to bundled solc.
 */
function loadSolcVersionWithFallback(versionTag, timeoutMs = 20_000) {
  return new Promise((resolve) => {
    let done = false;

    // Try remote load
    try {
      solc.loadRemoteVersion(versionTag, (err, solcjs) => {
        if (!done) {
          done = true;
          if (err) {
            console.warn("solc.loadRemoteVersion failed, using local solc:", err.message);
            resolve(solc); // fallback
          } else {
            resolve(solcjs);
          }
        }
      });
    } catch (e) {
      console.warn("loadRemoteVersion threw, using local solc:", e.message);
      resolve(solc);
    }

    // timeout fallback
    setTimeout(() => {
      if (!done) {
        done = true;
        console.warn("loadRemoteVersion timed out, using local solc");
        resolve(solc);
      }
    }, timeoutMs);
  });
}

/**
 * Compiles Standard JSON using the selected solc instance
 */
function compileWithSolc(solcInstance, inputJson) {
  // synchronous compile (solcjs is itself JS)
  const outputStr = solcInstance.compile(JSON.stringify(inputJson));
  return JSON.parse(outputStr);
}

/**
 * Try to obtain a numeric compiler-provided "deployment" cost from evm.gasEstimates if present.
 */
function tryCompilerDeploymentEstimate(contractOutput) {
  // evm.gasEstimates format is inconsistent across versions.
  const est = contractOutput?.evm?.gasEstimates;
  if (!est) return null;

  // common places:
  // est.creation && est.creation["codeDepositCost"]
  if (est.creation) {
    // direct numeric fields
    const keys = ["codeDepositCost", "codeDeposit", "totalCost", "creation"];
    for (const k of keys) {
      if (est.creation[k]) {
        const v = est.creation[k];
        if (typeof v === "number" || /^\d+$/.test(String(v))) return Number(v);
      }
    }
    // sometimes it's a string number
    if (typeof est.creation === "string" && /^\d+$/.test(est.creation)) return Number(est.creation);
  }
  return null;
}

/**
 * Estimates gas for given transaction data using RPC
 */
export async function estimateGas({ rpcUrl, to, data, from }) {
  try {
    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const estimate = await provider.estimateGas({
      to,
      data,
      from,
    });
    return estimate.toString();
  } catch (err) {
    console.error("Gas estimation failed:", err);
    throw new Error("Gas estimation failed: " + (err.message || err));
  }
}

/**
 * Handler: plain RPC estimate (unchanged)
 */
export async function estimateGasHandler(req, res) {
  const { to, data, chain, from } = req.body;
  if (!to || !data) return res.status(400).json({ error: "Missing 'to' or 'data'" });

  try {
    const rpcUrl = chain === "ethereum" ? process.env.ETHEREUM_RPC_URL : process.env.MONAD_RPC_URL;
    const gasUsed = await estimateGas({ rpcUrl, to, data, from });
    res.json({ gasUsed });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}

/**
 * Handler: compile (multi-file) + estimate deployment gas + metrics
 *
 * Accepts:
 * - sourceCode (string) OR
 * - sources (object mapping filename -> { content })
 *
 * Optional query param 'mode':
 * - mode: "fast" => prefer compiler estimates (fast)
 * - mode: "rpc" => prefer RPC estimate for deployments (slower, often more reliable)
 */
export async function compileAndEstimateHandler(req, res) {
  try {
    let { sourceCode, sources, chain, mode } = req.body;
    mode = mode || "fast";

    if (!sourceCode && !sources) {
      return res.status(400).json({ error: "Missing Solidity source code or sources map" });
    }

    // normalize to sources map
    if (sourceCode && !sources) {
      sources = { "Contract.sol": { content: sourceCode } };
    }

    // Resolve imports (external via unpkg/raw, errors for missing relative files)
    const resolvedSources = await resolveAllImports(sources);

    // pick solc version from pragma
    const solcVersionTag = pickSolcVersionFromPragma(resolvedSources);
    const solcInstance = await loadSolcVersionWithFallback(solcVersionTag);

    const inputJson = {
      language: "Solidity",
      sources: resolvedSources,
      settings: {
        optimizer: { enabled: false, runs: 200 },
        outputSelection: {
          "*": {
            "*": ["abi", "evm.bytecode", "evm.deployedBytecode", "evm.gasEstimates", "metadata"]
          }
        }
      }
    };

    const start = Date.now();
    const output = compileWithSolc(solcInstance, inputJson);
    const end = Date.now();
    const compileTimeMs = end - start;
    const cpuCount = os.cpus().length;

    if (output.errors && output.errors.length) {
      const fatal = output.errors.filter(e => e.severity === "error");
      if (fatal.length) {
        return res.status(400).json({ error: "Compilation failed", details: fatal });
      }
      // non-fatal warnings can be returned but not considered fatal
    }

    // Gather contracts
    const results = [];
    const rpcUrl = chain === "ethereum" ? process.env.ETHEREUM_RPC_URL : process.env.MONAD_RPC_URL;
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    for (const [filename, fileContracts] of Object.entries(output.contracts || {})) {
      for (const [contractName, contractOutput] of Object.entries(fileContracts)) {
        const bytecode = contractOutput?.evm?.bytecode?.object || "";
        let gasEstimate = null;
        let usedCompilerEstimate = false;

        // 1) Try compiler-provided estimate
        const compEstimate = tryCompilerDeploymentEstimate(contractOutput);
        if (compEstimate && mode === "fast") {
          gasEstimate = compEstimate;
          usedCompilerEstimate = true;
        }

        // 2) Fallback: use RPC provider estimate of the creation transaction
        if (!gasEstimate) {
          if (!bytecode || bytecode.length === 0) {
            // nothing to estimate
            gasEstimate = null;
          } else {
            try {
              // provider.estimateGas may require a 'from' for some nodes; we pass no from (node will pick)
              const estimate = await provider.estimateGas({ data: "0x" + bytecode });
              gasEstimate = Number(estimate.toString());
            } catch (e) {
              console.warn(`RPC estimateGas failed for ${contractName} (${filename}):`, e.message || e);
              gasEstimate = null;
            }
          }
        }

        const contractGas = gasEstimate == null ? null : String(gasEstimate);
        const gasPerSecond = gasEstimate ? (Number(gasEstimate) / (compileTimeMs / 1000)).toFixed(2) : null;

        results.push({
          name: `${contractName} (${filename})`,
          contractName,
          filename,
          abi: contractOutput.abi,
          bytecode: bytecode ? `0x${bytecode}` : null,
          gasUsed: contractGas,
          metrics: {
            compileTimeMs,
            parallelism: cpuCount,
            gasPerSecond,
            usingCompilerEstimate: usedCompilerEstimate,
          }
        });
      }
    }

    res.json({ results, compileTimeMs });
  } catch (err) {
    console.error("compileAndEstimateHandler error:", err);
    res.status(500).json({ error: err.message || String(err) });
  }
}
