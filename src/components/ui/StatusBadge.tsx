export function StatusBadge({
  label,
  bg,
  text,
}: {
  label: string;
  bg: string;
  text: string;
}) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold whitespace-nowrap"
      style={{ background: bg, color: text }}
    >
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: text }} />
      {label}
    </span>
  );
}
