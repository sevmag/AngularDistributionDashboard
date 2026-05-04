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
import type { Vec3 } from "@/lib/esag";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "ESAG Explorer — Elliptically Symmetric Angular Gaussian on S²" },
      {
        name: "description",
        content:
          "Interactive dashboard for the Elliptically Symmetric Angular Gaussian (ESAG) distribution on the sphere. Adjust μ and γ, compare with IAG and Kent.",
      },
    ],
  }),
});

const PRESETS: { name: string; mu: Vec3; gamma: [number, number] }[] = [
  { name: "IAG (isotropic)", mu: [0, 0, 2], gamma: [0, 0] },
  { name: "Mild ellipse", mu: [-1, -2, 2], gamma: [-1, 1] },
  { name: "Concentrated", mu: [-2, -4, 4], gamma: [-1, 1] },
  { name: "Highly anisotropic", mu: [-2, -4, 4], gamma: [-3, 1] },
  { name: "Bimodal regime", mu: [0, 0, 0.6], gamma: [3.5, 0] },
];

function Index() {
  const [mu, setMu] = useState<Vec3>([-1, -2, 2]);
  const [gamma, setGamma] = useState<[number, number]>([-1, 1]);
  const [kind, setKind] = useState<DistKind>("esag");
  const [compare, setCompare] = useState(false);
  const [showAxes, setShowAxes] = useState(true);
  const [showMean, setShowMean] = useState(true);

  const alpha = useMemo(() => Math.hypot(mu[0], mu[1], mu[2]), [mu]);

  const setMuComp = (i: number, v: number) => {
    const next = [...mu] as Vec3;
    next[i] = v;
    // avoid degenerate zero
    if (Math.hypot(next[0], next[1], next[2]) < 0.05) next[i] = v + 0.05;
    setMu(next);
  };

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
                The Elliptically Symmetric Angular Gaussian on S²
              </h1>
              <p className="mt-2 max-w-3xl text-sm text-muted-foreground">
                A live exploration of the ESAG(μ, γ) family of Paine, Preston, Tsagris &amp; Wood
                (Stat. Comput., 2018). Drag the sphere; adjust the mean direction μ ∈ ℝ³ and the
                shape vector γ ∈ ℝ². Compare with the rotationally symmetric IAG and the Kent
                (FB₅) distribution.
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
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_360px] gap-8">
          {/* Plot panel */}
          <section>
            <Card className="overflow-hidden p-0">
              <div className="flex items-center justify-between border-b border-border px-4 py-3">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-[10px] uppercase tracking-widest text-muted-foreground">
                    Fig.
                  </span>
                  <h2 className="text-base font-medium">
                    {compare
                      ? "ESAG(μ, γ) vs. IAG(μ) vs. Kent (matched)"
                      : kind === "esag"
                        ? "ESAG(μ, γ) density on S²"
                        : kind === "iag"
                          ? "IAG(μ) density on S²"
                          : "Kent (FB₅) density on S²"}
                  </h2>
                </div>
                <Tabs value={compare ? "compare" : kind} onValueChange={(v) => {
                  if (v === "compare") setCompare(true);
                  else { setCompare(false); setKind(v as DistKind); }
                }}>
                  <TabsList>
                    <TabsTrigger value="esag">ESAG</TabsTrigger>
                    <TabsTrigger value="iag">IAG</TabsTrigger>
                    <TabsTrigger value="kent">Kent</TabsTrigger>
                    <TabsTrigger value="compare">Compare</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>

              {compare ? (
                <div className="grid grid-cols-1 md:grid-cols-3 divide-y md:divide-y-0 md:divide-x divide-border">
                  <SphereCell title="ESAG(μ, γ)" mu={mu} gamma={gamma} kind="esag" showAxes={showAxes} showMean={showMean} />
                  <SphereCell title="IAG(μ)" mu={mu} gamma={gamma} kind="iag" showAxes={showAxes} showMean={showMean} />
                  <SphereCell title="Kent (matched)" mu={mu} gamma={gamma} kind="kent" showAxes={showAxes} showMean={showMean} />
                </div>
              ) : (
                <div className="h-[520px] w-full">
                  <Suspense fallback={null}>
                    <DensitySphere mu={mu} gamma={gamma} kind={kind} showAxes={showAxes} showMean={showMean} />
                  </Suspense>
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-4 border-t border-border px-4 py-3">
                <Colorbar />
                <p className="font-mono text-[11px] text-muted-foreground">
                  α = ‖μ‖ = {alpha.toFixed(3)} &nbsp;·&nbsp; ‖γ‖ ={" "}
                  {Math.hypot(gamma[0], gamma[1]).toFixed(3)}
                </p>
              </div>
            </Card>

            <figcaption className="mt-3 text-xs text-muted-foreground italic">
              Density is rendered per-vertex on a 192×128 spherical mesh and rescaled to the
              displayed maximum (γ = 0.55 tone-curve) so contour topology is comparable across
              parameter regimes. Drag to rotate · scroll to zoom.
            </figcaption>
          </section>

          {/* Controls */}
          <aside className="space-y-6">
            <Card className="p-5">
              <h3 className="text-lg font-semibold">Mean direction μ</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Sets the modal direction μ/‖μ‖ and concentration α = ‖μ‖.
              </p>
              <div className="mt-4 space-y-4">
                {(["μ₁", "μ₂", "μ₃"] as const).map((name, i) => (
                  <div key={name}>
                    <div className="flex items-baseline justify-between">
                      <Label className="font-serif italic">{name}</Label>
                      <span className="font-mono text-xs text-muted-foreground">
                        {mu[i].toFixed(2)}
                      </span>
                    </div>
                    <Slider
                      value={[mu[i]]}
                      min={-6}
                      max={6}
                      step={0.05}
                      onValueChange={(v) => setMuComp(i, v[0])}
                      className="mt-2"
                    />
                  </div>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-lg font-semibold">Shape γ</h3>
              <p className="mt-1 text-xs text-muted-foreground">
                Unrestricted parameterisation (Lemma 1). γ = 0 ⇒ IAG.
              </p>
              <div className="mt-4 space-y-4">
                {(["γ₁", "γ₂"] as const).map((name, i) => (
                  <div key={name}>
                    <div className="flex items-baseline justify-between">
                      <Label className="font-serif italic">{name}</Label>
                      <span className="font-mono text-xs text-muted-foreground">
                        {gamma[i].toFixed(2)}
                      </span>
                    </div>
                    <Slider
                      value={[gamma[i]]}
                      min={-5}
                      max={5}
                      step={0.05}
                      onValueChange={(v) => {
                        const next = [...gamma] as [number, number];
                        next[i] = v[0];
                        setGamma(next);
                      }}
                      className="mt-2"
                    />
                  </div>
                ))}
              </div>
              <Separator className="my-4" />
              <div className="space-y-3">
                <Toggle label="Show coordinate axes" value={showAxes} onChange={setShowAxes} />
                <Toggle label="Show mean direction" value={showMean} onChange={setShowMean} />
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-lg font-semibold">Presets</h3>
              <div className="mt-3 flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <Button
                    key={p.name}
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setMu(p.mu);
                      setGamma(p.gamma);
                    }}
                  >
                    {p.name}
                  </Button>
                ))}
              </div>
            </Card>

            <Card className="p-5">
              <h3 className="text-base font-semibold">About this figure</h3>
              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">
                ESAG is the angular-Gaussian analogue of Kent's FB₅: an elliptically-symmetric
                family on S<sup>d−1</sup> with a closed-form density (no special functions
                beyond Φ) and trivial sampling — draw z ∼ N(μ, V), set y = z/‖z‖. The Kent
                density shown for comparison uses a heuristic parameter match
                (κ = α², β ∝ ‖γ‖κ) and is rendered unnormalised, so colours indicate
                relative shape, not absolute densities.
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
  kind,
  showAxes,
  showMean,
}: {
  title: string;
  mu: Vec3;
  gamma: [number, number];
  kind: DistKind;
  showAxes: boolean;
  showMean: boolean;
}) {
  return (
    <div className="flex flex-col">
      <div className="border-b border-border px-3 py-2 text-center font-serif text-sm italic">
        {title}
      </div>
      <div className="h-[360px]">
        <Suspense fallback={null}>
          <DensitySphere mu={mu} gamma={gamma} kind={kind} showAxes={showAxes} showMean={showMean} />
        </Suspense>
      </div>
    </div>
  );
}
