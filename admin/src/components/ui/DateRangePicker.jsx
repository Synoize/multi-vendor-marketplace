export default function DateRangePicker({ from, to, onChange, className = '' }) {
  const handleFromChange = (e) => {
    onChange({ from: e.target.value, to });
  };

  const handleToChange = (e) => {
    onChange({ from, to: e.target.value });
  };

  const handleReset = () => {
    onChange({ from: '', to: '' });
  };

  const setPreset = (days) => {
    const end = new Date();
    const start = new Date();
    start.setDate(start.getDate() - days);
    const toISO = (d) => d.toISOString().split('T')[0];
    onChange({ from: toISO(start), to: toISO(end) });
  };

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 whitespace-nowrap">From</label>
        <input
          type="date"
          value={from || ''}
          onChange={handleFromChange}
          className="bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 py-2 px-3 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-50 transition-all"
          max={to || undefined}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 whitespace-nowrap">To</label>
        <input
          type="date"
          value={to || ''}
          onChange={handleToChange}
          className="bg-gray-50 border border-gray-200 rounded-xl text-sm text-gray-900 py-2 px-3 focus:outline-none focus:border-red-300 focus:ring-2 focus:ring-red-50 transition-all"
          min={from || undefined}
        />
      </div>
      <div className="flex items-center gap-1">
        {[7, 30, 90].map((days) => (
          <button
            key={days}
            onClick={() => setPreset(days)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700 transition-all duration-200 font-medium"
          >
            {days}d
          </button>
        ))}
        {(from || to) && (
          <button
            onClick={handleReset}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-red-50 text-red-500 hover:bg-red-100 transition-all duration-200 font-medium"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
