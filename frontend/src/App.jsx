import { useState } from "react";
import Navbar from "./components/Navbar";
import EditorPanel from "./components/EditorPanel";
import ResultsPanel from "./components/ResultsPanel";
import SplashScreen from "./components/SplashScreen";
import { motion } from "framer-motion";
import axios from "axios";

export default function App() {
  const [code, setCode] = useState("// Write your Solidity code here");
  const [compareEthereum, setCompareEthereum] = useState(false);
  const [showUI, setShowUI] = useState(false);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);

  const analyzeGas = async () => {
    setLoading(true);
    try {
      // Compile and estimate for Monad
      const monadRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/compile-and-estimate`, {
        sourceCode: code,
        chain: "monad",
      });

      let results = [
        {
          name: "Monad",
          gas: Number(monadRes.data.gasUsed),
          metrics: monadRes.data.metrics,
        }
      ];

      // Ethereum comparison
      if (compareEthereum) {
        const ethRes = await axios.post(`${import.meta.env.VITE_API_BASE_URL}/api/compile-and-estimate`, {

          sourceCode: code,
          chain: "ethereum",
        });
        results.push({
          name: "Ethereum",
          gas: Number(ethRes.data.gasUsed),
          metrics: ethRes.data.metrics,
        });
      }

      setData(results);
    } catch (error) {
      console.error("Error compiling or estimating gas:", error.response?.data || error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SplashScreen onFinish={() => setShowUI(true)} />
      {showUI && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
          className="min-h-screen bg-gray-950 text-white flex flex-col"
        >
          <Navbar />
          <div className="flex flex-1">
            <EditorPanel
              code={code}
              setCode={setCode}
              onEstimateGas={analyzeGas}
              loading={loading}
            />
            <ResultsPanel
              data={data}
              loading={loading}
              compareEthereum={compareEthereum}
              setCompareEthereum={setCompareEthereum}
            />
          </div>
        </motion.div>
      )}
    </>
  );
}
