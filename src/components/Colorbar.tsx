export function Colorbar({ label = "Density (relative)" }: { label?: string }) {
  return (
    <div className="flex items-center gap-3 text-xs text-muted-foreground">
      <span className="font-mono">low</span>
      <div
        className="h-2 w-44 rounded-sm border border-border"
        style={{
          background:
            "linear-gradient(to right, rgb(13,7,134), rgb(106,3,168), rgb(184,71,144), rgb(238,143,99), rgb(252,201,59), rgb(240,249,33))",
        }}
      />
      <span className="font-mono">high</span>
      <span className="ml-2 italic">{label}</span>
    </div>
  );
}