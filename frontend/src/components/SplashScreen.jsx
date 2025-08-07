import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { Code2 } from "lucide-react"; // ← TEMP placeholder icon
import Particles from "react-tsparticles";
import { loadFull } from "tsparticles";

export default function SplashScreen({ onFinish }) {
  const [show, setShow] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShow(false);
      if (onFinish) onFinish();
    }, 2000); 
    return () => clearTimeout(timer);
  }, [onFinish]);

  const particlesInit = async (main) => {
    await loadFull(main);
  };

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          className="fixed inset-0 bg-gradient-to-br from-purple-800 via-purple-900 to-black flex flex-col items-center justify-center z-50"
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.8, ease: "easeInOut" }}
        >
          
          <Particles
            id="tsparticles"
            init={particlesInit}
            options={{
              background: { color: "transparent" },
              fpsLimit: 60,
              interactivity: {
                events: { onHover: { enable: true, mode: "repulse" } },
              },
              particles: {
                color: { value: "#a855f7" }, 
                links: {
                  color: "#a855f7",
                  distance: 150,
                  enable: true,
                  opacity: 0.3,
                  width: 1,
                },
                move: { enable: true, speed: 0.5 },
                number: { value: 40 },
                opacity: { value: 0.5 },
                shape: { type: "circle" },
                size: { value: { min: 1, max: 3 } },
              },
              detectRetina: true,
            }}
            className="absolute inset-0"
          />

          
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.6, ease: "easeOut" }}
            className="flex flex-col items-center gap-3 relative z-10"
          >
           
            <img src="/monad-logo.jpg" alt="Monad Logo" className="w-16 h-16" />


            <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-300 to-purple-500 bg-clip-text text-transparent">
              Monad Gas Visualizer
            </h1>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
