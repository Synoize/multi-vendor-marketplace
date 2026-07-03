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

  // Quick presets
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
          className="input-dark text-sm py-2 px-3"
          max={to || undefined}
        />
      </div>
      <div className="flex items-center gap-2">
        <label className="text-xs text-gray-500 whitespace-nowrap">To</label>
        <input
          type="date"
          value={to || ''}
          onChange={handleToChange}
          className="input-dark text-sm py-2 px-3"
          min={from || undefined}
        />
      </div>
      <div className="flex items-center gap-1">
        {[7, 30, 90].map((days) => (
          <button
            key={days}
            onClick={() => setPreset(days)}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 transition-all duration-200 border border-white/10"
          >
            {days}d
          </button>
        ))}
        {(from || to) && (
          <button
            onClick={handleReset}
            className="text-xs px-2.5 py-1.5 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-all duration-200 border border-red-500/20"
          >
            Clear
          </button>
        )}
      </div>
    </div>
  );
}
