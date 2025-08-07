export default function CompareToggle({ compareEthereum, setCompareEthereum }) {
    return (
      <div className="mt-6 flex items-center gap-3 bg-purple-900/30 p-3 rounded-lg border border-purple-700/40 shadow-sm backdrop-blur-md">
        <span className="text-sm font-medium">Compare to Ethereum</span>
        <label className="relative inline-flex items-center cursor-pointer">
          <input
            type="checkbox"
            checked={compareEthereum}
            onChange={() => setCompareEthereum(!compareEthereum)}
            className="sr-only peer"
          />
          <div className="w-11 h-6 bg-gray-700 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-purple-400 rounded-full peer dark:bg-gray-600 peer-checked:bg-purple-600 peer-checked:after:translate-x-full after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all shadow" />
        </label>
      </div>
    );
  }
  