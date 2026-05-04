import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, Suspense } from "react";
import { DensitySphere, type DistKind } from "@/components/DensitySphere";
import { Colorbar } from "@/components/Colorbar";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import type { Vec3, GAGParams } from "@/lib/esag";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "Angular Gaussian Explorer — IAG · ESAG · GAG · Kent on S²" },
      {
        name: "description",
        content:
          "Interactive dashboard for the Angular Gaussian family on the sphere: IAG, ESAG, the fully general GAG and Kent (FB₅).",
      },
    ],
  }),
});

// Fixed mean direction for visualisation: μ̂ = (0, 0, 1). Only the scale α = ‖μ‖ varies.
const MU_HAT: Vec3 = [0, 0, 1];

interface ESAGState {
  alpha: number;
  gamma: [number, number];
}
interface IAGState {
  alpha: number;
}
interface KentState {
  alpha: number;
  gamma: [number, number];
}
interface GAGState {
  alpha: number;
  psi: number;
  theta: number;
  phi: number;
  logLam1: number;
  logLam2: number;
}

const ESAG_PRESETS: { name: string; s: ESAGState }[] = [
  { name: "Mild ellipse", s: { alpha: 3, gamma: [-1, 1] } },
  { name: "Concentrated", s: { alpha: 6, gamma: [-1, 1] } },
  { name: "Highly anisotropic", s: { alpha: 6, gamma: [-3, 1] } },
  { name: "Bimodal regime", s: { alpha: 0.6, gamma: [3.5, 0] } },
];
const GAG_PRESETS: { name: string; s: GAGState }[] = [
  { name: "Spherical (≈IAG)", s: { alpha: 3, psi: 0, theta: 0, phi: 0, logLam1: 0, logLam2: 0 } },
  { name: "Aligned ellipse", s: { alpha: 4, psi: 0, theta: 0, phi: 0, logLam1: 1.0, logLam2: -1.0 } },
  { name: "Tilted axes", s: { alpha: 4, psi: 0.5, theta: 0.7, phi: 0.3, logLam1: 1.2, logLam2: -0.8 } },
  { name: "Off-axis V", s: { alpha: 2.5, psi: 0, theta: Math.PI / 3, phi: 0, logLam1: 1.5, logLam2: 0 } },
];

function Index() {
  const [kind, setKind] = useState<DistKind>("esag");
  const [compare, setCompare] = useState(false);

  const [iag, setIag] = useState<IAGState>({ alpha: 3 });
  const [esag, setEsag] = useState<ESAGState>({ alpha: 3, gamma: [-1, 1] });
  const [kent, setKent] = useState<KentState>({ alpha: 3, gamma: [-1, 1] });
  const [gag, setGag] = useState<GAGState>({
    alpha: 3,
    psi: 0,
    theta: 0,
    phi: 0,
    logLam1: 0.8,
    logLam2: -0.4,
  });

  const [showAxes, setShowAxes] = useState(true);
  const [showMean, setShowMean] = useState(true);
  const [showIso, setShowIso] = useState(true);
  const [isoLevels, setIsoLevels] = useState(10);

  // Translate per-kind state to DensitySphere props.
  const stateForKind = (k: DistKind) => {
    if (k === "iag") {
      return {
        mu: scale(MU_HAT, iag.alpha),
        gamma: [0, 0] as [number, number],
        gag: zeroGAG(),
      };
    }
    if (k === "esag") {
      return {
        mu: scale(MU_HAT, esag.alpha),
        gamma: esag.gamma,
        gag: zeroGAG(),
      };
    }
    if (k === "kent") {
      return {
        mu: scale(MU_HAT, kent.alpha),
        gamma: kent.gamma,
        gag: zeroGAG(),
      };
    }
    // gag
    return {
      mu: scale(MU_HAT, gag.alpha),
      gamma: [0, 0] as [number, number],
      gag: gagToParams(gag),
    };
  };

  const cur = stateForKind(kind);

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border bg-card/50 backdrop-blur">
        <div className="mx-auto max-w-7xl px-6 py-6">
          <div className="flex items-baseline justify-between gap-6 flex-wrap">
            <div>
              <p className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Directional statistics · interactive figure
              </p>
              <h1 className="mt-1 text-3xl md:text-4xl font-semibold">
                Angular Gaussian distributions on S²
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                Mean direction is fixed at μ̂ = (0, 0, 1); only the concentration α = ‖μ‖ and
                shape parameters vary. Compare the isotropic (IAG), elliptically symmetric (ESAG),
                fully general (GAG) angular Gaussians, and the Kent FB₅ for reference.
              </p>
            </div>
            <a
              className="font-mono text-xs text-primary underline underline-offset-4 hover:opacity-80"
              href="https://link.springer.com/article/10.1007/s11222-017-9756-4"
              target="_blank"
              rel="noreferrer"
            >
              ↗ source paper
            </a>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_380px] gap-8">
          <section>
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Fig.
                  </span>
                  <h2 className="text-base font-medium">
                    {compare
                      ? "IAG vs ESAG vs GAG vs Kent"
                      : kindTitle(kind)}
                  </h2>
                </div>
                <Tabs
                  value={compare ? "compare" : kind}
                  onValueChange={(v) => {
                    if (v === "compare") setCompare(true);
                    else {
                      setCompare(false);
                      setKind(v as DistKind);
                    }
                  }}
                >
                  <TabsList>
                    <TabsTrigger value="iag">IAG</TabsTrigger>
                    <TabsTrigger value="esag">ESAG</TabsTrigger>
                    <TabsTrigger value="gag">GAG</TabsTrigger>
                    <TabsTrigger value="kent">Kent</TabsTrigger>
                    <TabsTrigger value="compare">Compare</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {compare ? (
                <div className="grid grid-cols-2 divide-y divide-x divide-border">
                  {(["iag", "esag", "gag", "kent"] as DistKind[]).map((k) => {
                    const s = stateForKind(k);
                    return (
                      <SphereCell
                        key={k}
                        title={kindTitle(k)}
                        mu={s.mu}
                        gamma={s.gamma}
                        gag={s.gag}
                        kind={k}
                        showAxes={showAxes}
                        showMean={showMean}
                        showIso={showIso}
                        isoLevels={isoLevels}
                      />
                    );
                  })}
                </div>
              ) : (
                <div className="h-[520px] w-full">
                  <Suspense fallback={null}>
                    <DensitySphere
                      mu={cur.mu}
                      gamma={cur.gamma}
                      gag={cur.gag}
                      kind={kind}
                      showAxes={showAxes}
                      showMean={showMean}
                      showIso={showIso}
                      isoLevels={isoLevels}
                    />
                  </Suspense>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-4 py-3">
                <Colorbar />
                <p className="font-mono text-[11px] text-muted-foreground">
                  μ̂ = (0, 0, 1) &nbsp;·&nbsp; α = {curAlpha(kind, iag, esag, kent, gag).toFixed(2)}
                </p>
              </div>
            </Card>

            <figcaption className="mt-3 text-xs text-muted-foreground italic">
              Density rendered per-vertex on a 320×200 spherical mesh; iso-density lines drawn in
              screen space (constant pixel width via fragment-shader fwidth). Drag to rotate ·
              scroll to zoom.
            </figcaption>
          </section>

          <aside className="space-y-6">
            <Card className="p-5">
              <h3 className="text-lg font-semibold">
                {compare ? "Parameters" : `Parameters — ${kindShort(kind)}`}
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {paramHint(compare ? "compare" : kind)}
              </p>

              {compare ? (
                <div className="mt-4 space-y-6">
                  <ParamGroup label="IAG">
                    <SliderRow label="α" value={iag.alpha} min={0.1} max={8} step={0.05}
                      onChange={(v) => setIag({ alpha: v })} />
                  </ParamGroup>
                  <ParamGroup label="ESAG">
                    <SliderRow label="α" value={esag.alpha} min={0.1} max={8} step={0.05}
                      onChange={(v) => setEsag({ ...esag, alpha: v })} />
                    <SliderRow label="γ₁" value={esag.gamma[0]} min={-5} max={5} step={0.05}
                      onChange={(v) => setEsag({ ...esag, gamma: [v, esag.gamma[1]] })} />
                    <SliderRow label="γ₂" value={esag.gamma[1]} min={-5} max={5} step={0.05}
                      onChange={(v) => setEsag({ ...esag, gamma: [esag.gamma[0], v] })} />
                  </ParamGroup>
                  <ParamGroup label="GAG">
                    <GAGControls gag={gag} setGag={setGag} />
                  </ParamGroup>
                  <ParamGroup label="Kent (FB₅)">
                    <SliderRow label="α" value={kent.alpha} min={0.1} max={8} step={0.05}
                      onChange={(v) => setKent({ ...kent, alpha: v })} />
                    <SliderRow label="γ₁" value={kent.gamma[0]} min={-5} max={5} step={0.05}
                      onChange={(v) => setKent({ ...kent, gamma: [v, kent.gamma[1]] })} />
                    <SliderRow label="γ₂" value={kent.gamma[1]} min={-5} max={5} step={0.05}
                      onChange={(v) => setKent({ ...kent, gamma: [kent.gamma[0], v] })} />
                  </ParamGroup>
                </div>
              ) : (
                <div className="mt-4 space-y-4">
                  {kind === "iag" && (
                    <SliderRow label="α = ‖μ‖" value={iag.alpha} min={0.1} max={8} step={0.05}
                      onChange={(v) => setIag({ alpha: v })} />
                  )}
                  {kind === "esag" && (
                    <>
                      <SliderRow label="α = ‖μ‖" value={esag.alpha} min={0.1} max={8} step={0.05}
                        onChange={(v) => setEsag({ ...esag, alpha: v })} />
                      <SliderRow label="γ₁" value={esag.gamma[0]} min={-5} max={5} step={0.05}
                        onChange={(v) => setEsag({ ...esag, gamma: [v, esag.gamma[1]] })} />
                      <SliderRow label="γ₂" value={esag.gamma[1]} min={-5} max={5} step={0.05}
                        onChange={(v) => setEsag({ ...esag, gamma: [esag.gamma[0], v] })} />
                      <PresetRow
                        items={ESAG_PRESETS}
                        onPick={(s) => setEsag(s)}
                      />
                    </>
                  )}
                  {kind === "gag" && (
                    <>
                      <GAGControls gag={gag} setGag={setGag} />
                      <PresetRow
                        items={GAG_PRESETS}
                        onPick={(s) => setGag(s)}
                      />
                    </>
                  )}
                  {kind === "kent" && (
                    <>
                      <SliderRow label="α = ‖μ‖" value={kent.alpha} min={0.1} max={8} step={0.05}
                        onChange={(v) => setKent({ ...kent, alpha: v })} />
                      <SliderRow label="γ₁ (ovalness)" value={kent.gamma[0]} min={-5} max={5} step={0.05}
                        onChange={(v) => setKent({ ...kent, gamma: [v, kent.gamma[1]] })} />
                      <SliderRow label="γ₂ (orient.)" value={kent.gamma[1]} min={-5} max={5} step={0.05}
                        onChange={(v) => setKent({ ...kent, gamma: [kent.gamma[0], v] })} />
                    </>
                  )}
                </div>
              )}
            </Card>

            <Card className="p-5">
              <h3 className="text-lg font-semibold">Display</h3>
              <div className="mt-3 space-y-3">
                <Toggle label="Coordinate axes" value={showAxes} onChange={setShowAxes} />
                <Toggle label="Mean direction marker" value={showMean} onChange={setShowMean} />
                <Toggle label="Iso-density lines" value={showIso} onChange={setShowIso} />
                <div>
                  <div className="flex items-baseline justify-between">
                    <Label className="text-sm">Iso-line count</Label>
                    <span className="font-mono text-xs text-muted-foreground">{isoLevels}</span>
                  </div>
                  <Slider
                    value={[isoLevels]}
                    min={4}
                    max={24}
                    step={1}
                    onValueChange={(v) => setIsoLevels(v[0])}
                    className="mt-2"
                    disabled={!showIso}
                  />
                </div>
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-base font-semibold">About</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                The angular Gaussian family takes y = z/‖z‖ for z ∼ N(μ, V). Choosing V = I gives
                the IAG; the ESAG (Paine et al., 2018) imposes elliptic symmetry through the
                two-parameter γ; the GAG keeps the full SPD V (parameterised here by ZYZ Euler
                angles and two log-eigenvalues with det V = 1). Kent's FB₅ is shown unnormalised
                with a heuristic match for visual reference.
              </p>
            </Card>
          </aside>
        </div>
      </main>

      <footer className="mt-12 border-t border-border">
        <div className="mx-auto max-w-7xl px-6 py-6 text-xs text-muted-foreground flex flex-wrap items-center justify-between gap-2">
          <span>
            Reference: Paine P.J., Preston S.P., Tsagris M., Wood A.T.A. (2018).{" "}
            <em>An elliptically symmetric angular Gaussian distribution.</em> Statistics and
            Computing 28, 689–697.
          </span>
          <span className="font-mono">∮ S² f dS = 1</span>
        </div>
      </footer>
    </div>
  );
}

function GAGControls({ gag, setGag }: { gag: GAGState; setGag: (s: GAGState) => void }) {
  return (
    <div className="space-y-4">
      <SliderRow label="α = ‖μ‖" value={gag.alpha} min={0.1} max={8} step={0.05}
        onChange={(v) => setGag({ ...gag, alpha: v })} />
      <SliderRow label="ψ (yaw)" value={gag.psi} min={-Math.PI} max={Math.PI} step={0.02}
        onChange={(v) => setGag({ ...gag, psi: v })} />
      <SliderRow label="θ (tilt)" value={gag.theta} min={0} max={Math.PI} step={0.02}
        onChange={(v) => setGag({ ...gag, theta: v })} />
      <SliderRow label="φ (roll)" value={gag.phi} min={-Math.PI} max={Math.PI} step={0.02}
        onChange={(v) => setGag({ ...gag, phi: v })} />
      <SliderRow label="log λ₁" value={gag.logLam1} min={-2.5} max={2.5} step={0.02}
        onChange={(v) => setGag({ ...gag, logLam1: v })} />
      <SliderRow label="log λ₂" value={gag.logLam2} min={-2.5} max={2.5} step={0.02}
        onChange={(v) => setGag({ ...gag, logLam2: v })} />
      <p className="font-mono text-[11px] text-muted-foreground">
        λ₃ = 1 / (λ₁λ₂) = {(1 / (Math.exp(gag.logLam1) * Math.exp(gag.logLam2))).toFixed(3)} &nbsp;·
        det V = 1
      </p>
    </div>
  );
}

function ParamGroup({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
        {label}
      </div>
      <div className="space-y-3">{children}</div>
      <Separator className="mt-4" />
    </div>
  );
}

function SliderRow({
  label,
  value,
  min,
  max,
  step,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  onChange: (v: number) => void;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between">
        <Label className="font-serif italic">{label}</Label>
        <span className="font-mono text-xs text-muted-foreground">{value.toFixed(2)}</span>
      </div>
      <Slider
        value={[value]}
        min={min}
        max={max}
        step={step}
        onValueChange={(v) => onChange(v[0])}
        className="mt-2"
      />
    </div>
  );
}

function PresetRow<T>({ items, onPick }: { items: { name: string; s: T }[]; onPick: (s: T) => void }) {
  return (
    <div className="pt-2">
      <div className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground mb-2">
        Presets
      </div>
      <div className="flex flex-wrap gap-2">
        {items.map((p) => (
          <Button key={p.name} variant="outline" size="sm" onClick={() => onPick(p.s)}>
            {p.name}
          </Button>
        ))}
      </div>
    </div>
  );
}

function Toggle({ label, value, onChange }: { label: string; value: boolean; onChange: (v: boolean) => void }) {
  return (
    <div className="flex items-center justify-between">
      <Label className="text-sm">{label}</Label>
      <Switch checked={value} onCheckedChange={onChange} />
    </div>
  );
}

function SphereCell({
  title,
  mu,
  gamma,
  gag,
  kind,
  showAxes,
  showMean,
  showIso,
  isoLevels,
}: {
  title: string;
  mu: Vec3;
  gamma: [number, number];
  gag: GAGParams;
  kind: DistKind;
  showAxes: boolean;
  showMean: boolean;
  showIso: boolean;
  isoLevels: number;
}) {
  return (
    <div className="flex flex-col">
      <div className="border-b border-border px-3 py-2 text-center font-serif text-sm italic">
        {title}
      </div>
      <div className="h-[340px]">
        <Suspense fallback={null}>
          <DensitySphere
            mu={mu}
            gamma={gamma}
            gag={gag}
            kind={kind}
            showAxes={showAxes}
            showMean={showMean}
            showIso={showIso}
            isoLevels={isoLevels}
          />
        </Suspense>
      </div>
    </div>
  );
}

// ---------- helpers ----------
function scale(v: Vec3, s: number): Vec3 {
  return [v[0] * s, v[1] * s, v[2] * s];
}
function zeroGAG(): GAGParams {
  return { psi: 0, theta: 0, phi: 0, logLam1: 0, logLam2: 0 };
}
function gagToParams(g: GAGState): GAGParams {
  return { psi: g.psi, theta: g.theta, phi: g.phi, logLam1: g.logLam1, logLam2: g.logLam2 };
}
function kindTitle(k: DistKind) {
  switch (k) {
    case "iag": return "IAG(μ) — isotropic";
    case "esag": return "ESAG(μ, γ) — elliptically symmetric";
    case "gag": return "GAG(μ, V) — general angular Gaussian";
    case "kent": return "Kent FB₅ (matched)";
  }
}
function kindShort(k: DistKind) {
  return k.toUpperCase();
}
function paramHint(k: DistKind | "compare") {
  switch (k) {
    case "iag": return "Single concentration parameter α = ‖μ‖.";
    case "esag": return "Unrestricted γ ∈ ℝ². γ = 0 ⇒ IAG.";
    case "gag": return "Full SPD V via ZYZ Euler angles + two log-eigenvalues (det V = 1).";
    case "kent": return "Heuristic match: κ = α², β ∝ ‖γ‖κ. Shown unnormalised.";
    case "compare": return "Each panel uses its own parameter set; α is shared semantically only.";
  }
}
function curAlpha(k: DistKind, iag: IAGState, esag: ESAGState, kent: KentState, gag: GAGState) {
  switch (k) {
    case "iag": return iag.alpha;
    case "esag": return esag.alpha;
    case "kent": return kent.alpha;
    case "gag": return gag.alpha;
  }
}
