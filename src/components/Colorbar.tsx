export function Colorbar({ label = "Density (relative)" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="font-mono">low</span>
      <div
        className="h-2 w-44 rounded-sm border border-border"
        style={{
          background:
            "linear-gradient(to right, rgb(0,34,78), rgb(42,79,110), rgb(115,118,118), rgb(199,168,92), rgb(255,232,79))",
        }}
      />
      <span className="font-mono">high</span>
      <span className="ml-2 italic">{label}</span>
    </div>
  );
}