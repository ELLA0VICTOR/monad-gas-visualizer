import { Editor } from "@monaco-editor/react";

export default function EditorPanel({ code, setCode, onEstimateGas, loading }) {
  return (
    <div className="w-1/2 border-r border-purple-800 p-4 bg-purple-950/20 backdrop-blur-lg">
      <h2 className="text-lg font-semibold mb-3 text-purple-300">Solidity Editor</h2>
      <div className="rounded-lg overflow-hidden border border-purple-800 shadow-lg">
        <Editor
          height="70vh"
          defaultLanguage="sol"
          value={code}
          theme="vs-dark"
          onChange={(value) => setCode(value)}
        />
      </div>
      <button
        onClick={onEstimateGas}
        disabled={loading}
        className={`mt-4 w-full px-4 py-2 rounded-lg shadow-md font-medium transition-all duration-300 ease-in-out 
          ${loading 
            ? "bg-purple-400 cursor-not-allowed" 
            : "bg-gradient-to-r from-purple-600 to-purple-500 hover:from-purple-500 hover:to-purple-400"
          }`}
      >
        {loading ? "Analyzing..." : "Estimate Gas"}
      </button>
    </div>
  );
}
