"use client";

export type SimpleTooltipProps = {
  active?: boolean;
  label?: string | number;
  payload?: ReadonlyArray<{ value?: number | string; name?: string | number; color?: string }>;
};

export function ChartTooltip({ active, payload, label }: SimpleTooltipProps) {
  if (!active || !payload || payload.length === 0) return null;

  return (
    <div className="rounded-md border bg-popover px-3 py-2 text-sm shadow-md">
      {label && <p className="font-medium mb-1">{label}</p>}
      {payload.map((entry, i) => (
        <div key={i} className="flex items-center gap-2 text-xs">
          <span
            className="size-2 rounded-full shrink-0"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}</span>
          <span className="font-medium ml-auto">{entry.value}</span>
        </div>
      ))}
    </div>
  );
}
