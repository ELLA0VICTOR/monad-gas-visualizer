import CompareToggle from "./CompareToggle";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid } from "recharts";

export default function ResultsPanel({ data, loading, compareEthereum, setCompareEthereum }) {
  return (
    <div className="w-1/2 p-4 bg-purple-950/20 backdrop-blur-lg">
      <h2 className="text-lg font-semibold mb-3 text-purple-300">Results</h2>

      <CompareToggle compareEthereum={compareEthereum} setCompareEthereum={setCompareEthereum} />

      {loading ? (
        <p className="text-purple-400 mt-4">Analyzing contract...</p>
      ) : data.length > 0 ? (
        <div className="space-y-6 mt-4">
          {/* Bar Chart */}
          <div className="h-64 bg-purple-900/20 p-3 rounded-lg border border-purple-800">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data}>
                <CartesianGrid strokeDasharray="3 3" stroke="#553c9a" />
                <XAxis dataKey="name" stroke="#d6bcfa" />
                <YAxis stroke="#d6bcfa" />
                <Tooltip
                  contentStyle={{ backgroundColor: "#2d1b4e", border: "1px solid #553c9a", color: "#fff" }}
                />
                <Legend />
                <Bar dataKey="gas" fill="#9f7aea" name="Gas Used" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Detailed metrics */}
          <div className="space-y-4">
            {data.map((result, idx) => (
              <div
                key={idx}
                className="p-4 border border-purple-800 rounded-lg bg-purple-900/20"
              >
                <h3 className="font-semibold text-purple-200">{result.name}</h3>
                <p>Gas Used: <span className="text-purple-300">{result.gas}</span></p>
                {result.metrics && (
                  <div className="mt-2 text-sm text-purple-400">
                    <p>Compile Time: {result.metrics.compileTimeMs} ms</p>
                    <p>Parallelism: {result.metrics.parallelism}</p>
                    <p>Gas/sec: {result.metrics.gasPerSecond}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ) : (
        <p className="text-purple-400 mt-4">No results yet.</p>
      )}
    </div>
  );
}
