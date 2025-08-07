import { Code2, Info } from "lucide-react";

export default function Navbar() {
  return (
    <nav className="bg-gradient-to-r from-purple-700 via-purple-800 to-purple-900 px-6 py-4 flex justify-between items-center shadow-lg border-b border-purple-500/30 backdrop-blur-md">
      <div className="flex items-center gap-2 font-bold text-xl tracking-wide">
        <Code2 size={24} className="text-purple-300" />
        <span className="bg-gradient-to-r from-purple-300 to-purple-500 bg-clip-text text-transparent">
          Monad Gas Visualizer
        </span>
      </div>
      <button className="flex items-center gap-1 px-3 py-1 text-sm rounded-lg border border-purple-500/40 hover:bg-purple-700 hover:border-purple-400 transition duration-300 ease-in-out">
        <Info size={18} /> About
      </button>
    </nav>
  );
}
