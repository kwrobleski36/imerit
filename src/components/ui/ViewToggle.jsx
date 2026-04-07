export function ViewToggle({ value, onChange }) {
  return (
    <div className="inline-flex rounded border border-torn-border bg-torn-surface overflow-hidden">
      {[{ key: 'visual', label: '▣  Visual' }, { key: 'text', label: '≡  Text' }].map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          className={`px-4 py-1.5 text-sm font-mono transition-colors duration-150 ${
            value === key
              ? 'bg-torn-accent text-torn-bg font-semibold'
              : 'text-torn-text-dim hover:text-torn-text'
          }`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}
