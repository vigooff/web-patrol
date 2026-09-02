export function PageHeader({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between mb-6">
      <div>
        <h1 className="text-xl font-extrabold">{title}</h1>
        {description && (
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            {description}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
