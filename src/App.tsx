import {
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type FormEvent,
} from "react";
import logoMarkUrl from "./assets/crystal-blue-mark.svg";
import vistaUrl from "./assets/gulf-coast-vista-beach.png";

type Pt = { x: number; y: number };

// Solve cubic-bezier(p1x,p1y,p2x,p2y) -> easing function y(x), matching the
// CSS timing the original wipe used.
function cubicBezier(p1x: number, p1y: number, p2x: number, p2y: number) {
  const cx = 3 * p1x;
  const bx = 3 * (p2x - p1x) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * p1y;
  const by = 3 * (p2y - p1y) - cy;
  const ay = 1 - cy - by;
  const fx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const dfx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  const fy = (t: number) => ((ay * t + by) * t + cy) * t;
  return (x: number) => {
    let t = x;
    for (let i = 0; i < 6; i++) {
      const err = fx(t) - x;
      if (Math.abs(err) < 1e-4) break;
      const d = dfx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    return fy(t);
  };
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
) {
  ctx.beginPath();
  ctx.roundRect(x, y, w, h, r);
}

// Paint dirty frosted glass once: a hazy frosted base, soft cloudy smudges,
// scattered water spots (varied, not a uniform dot grid) and a few faint drips.
function drawGrime(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const rand = (a: number, b: number) => a + Math.random() * (b - a);

  const base = ctx.createLinearGradient(0, 0, w * 0.2, h);
  base.addColorStop(0, "rgba(228, 232, 231, 0.56)");
  base.addColorStop(1, "rgba(150, 162, 165, 0.5)");
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, w, h);

  // soft cloudy haze / smears
  for (let i = 0; i < 28; i++) {
    const x = rand(0, w);
    const y = rand(0, h);
    const r = rand(80, 260);
    const dark = Math.random() < 0.5;
    const a = rand(0.04, 0.11);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, dark ? `rgba(42, 54, 60, ${a})` : `rgba(255, 255, 255, ${a})`);
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  // fine water spots — soft core with a faint ring
  for (let i = 0; i < 150; i++) {
    const x = rand(0, w);
    const y = rand(0, h);
    const r = rand(0.8, 3.2);
    const dark = Math.random() < 0.5;
    const a = rand(0.05, 0.16);
    const g = ctx.createRadialGradient(x, y, 0, x, y, r * 2.6);
    g.addColorStop(0, dark ? `rgba(38, 48, 52, ${a})` : `rgba(255, 255, 255, ${a})`);
    g.addColorStop(0.55, dark ? `rgba(38, 48, 52, ${a * 0.4})` : `rgba(255, 255, 255, ${a * 0.4})`);
    g.addColorStop(1, "rgba(0, 0, 0, 0)");
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r * 2.6, 0, Math.PI * 2);
    ctx.fill();
  }

  // faint vertical drip streaks
  for (let i = 0; i < 11; i++) {
    const x = rand(0, w);
    const sw = rand(8, 30);
    const sh = rand(60, 240);
    const y = rand(0, h * 0.7);
    const g = ctx.createLinearGradient(x, y, x, y + sh);
    g.addColorStop(0, "rgba(255, 255, 255, 0)");
    g.addColorStop(0.5, `rgba(224, 230, 230, ${rand(0.05, 0.1)})`);
    g.addColorStop(1, "rgba(255, 255, 255, 0)");
    ctx.fillStyle = g;
    ctx.fillRect(x, y, sw, sh);
  }
}

// Build a painter for the squeegee (drop shadow + wet gleam + metal channel +
// rubber blade + T-handle). Everything is drawn in a local frame whose origin
// rides the channel line and whose +x points toward the dirty side, so every
// gradient is position-independent and is created exactly once. Per frame the
// only work is a translate/rotate and a few fills — no allocations, no GC
// churn (which is what was causing the wipe to stutter).
function makeSqueegeePainter(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  dir: Pt,
  span: number,
) {
  const ang = Math.atan2(dir.y, dir.x);
  const k = 1 / Math.SQRT2; // px along `dir` per unit of diagonal projection T

  // local-x offsets from the channel (+x = toward the dirty side)
  const shadowX = 14 * k;
  const bladeX = 16 * k;
  const gleamX = 46 * k;
  const cw = 18; // metal channel width

  const metal = ctx.createLinearGradient(-cw * k, 0, cw * k, 0);
  metal.addColorStop(0, "#8d9ea7");
  metal.addColorStop(0.42, "#e6eef1");
  metal.addColorStop(0.58, "#bcc9cf");
  metal.addColorStop(1, "#76858d");

  // T-handle geometry, reaching back over the cleaned glass (toward -x)
  const neckLen = 56;
  const neckW = 15;
  const gripThick = 24;
  const gripLen = 78;
  const gx = -neckLen - gripThick;

  const neck = ctx.createLinearGradient(0, -neckW / 2, 0, neckW / 2);
  neck.addColorStop(0, "#aebcc3");
  neck.addColorStop(0.5, "#eaf0f3");
  neck.addColorStop(1, "#869199");

  const grip = ctx.createLinearGradient(gx, 0, gx + gripThick, 0);
  grip.addColorStop(0, "#2a3940");
  grip.addColorStop(0.5, "#46585f");
  grip.addColorStop(1, "#222e34");

  // a blade-parallel line at local-x `x` (spans the whole canvas via ±span)
  const blade = (x: number, width: number, style: string | CanvasGradient) => {
    ctx.strokeStyle = style;
    ctx.lineWidth = width;
    ctx.beginPath();
    ctx.moveTo(x, -span);
    ctx.lineTo(x, span);
    ctx.stroke();
  };

  // Anchor the assembly at the foot of the perpendicular from the window centre
  // onto the channel line (x + y = channelT). This keeps the handle in the
  // middle of the window and, being linear in channelT, slides smoothly — the
  // old anchor was the foot from the (0,0) corner, which biased it top-left.
  const cMid = (w + h) / 2;
  return (channelT: number) => {
    const d = (channelT - cMid) / 2;
    const cx = w / 2 + d;
    const cy = h / 2 + d;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.lineCap = "round";

    // soft drop shadow, offset toward the dirty side (no shadowBlur)
    blade(shadowX, 22, "rgba(2, 24, 36, 0.16)");

    // wet gleam at the cleaned contact line — stacked strokes fake the glow
    blade(gleamX, 14, "rgba(255, 255, 255, 0.12)");
    blade(gleamX, 7, "rgba(255, 255, 255, 0.3)");
    blade(gleamX, 3, "rgba(255, 255, 255, 0.6)");

    // metal channel + rubber blade
    blade(0, cw, metal);
    blade(bladeX, 6, "#16242b");

    // T-handle: offset shadow first, then neck, grip and grip highlight
    ctx.fillStyle = "rgba(2, 24, 36, 0.16)";
    roundRect(ctx, -neckLen + 4, -neckW / 2 + 4, neckLen, neckW, 5);
    ctx.fill();
    roundRect(ctx, gx + 4, -gripLen / 2 + 4, gripThick, gripLen, 11);
    ctx.fill();

    roundRect(ctx, -neckLen, -neckW / 2, neckLen, neckW, 5);
    ctx.fillStyle = neck;
    ctx.fill();

    roundRect(ctx, gx, -gripLen / 2, gripThick, gripLen, 11);
    ctx.fillStyle = grip;
    ctx.fill();

    roundRect(ctx, gx + 4, -gripLen / 2 + 6, 4, gripLen - 12, 2);
    ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    ctx.fill();

    ctx.restore();
  };
}

function WindowWipe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [done, setDone] = useState(false);

  useLayoutEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setDone(true);
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      setDone(true);
      return;
    }

    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    ctx.scale(dpr, dpr);

    // offscreen grime layer — drawn once, only ever erased (so no residue)
    const grime = document.createElement("canvas");
    grime.width = canvas.width;
    grime.height = canvas.height;
    const gctx = grime.getContext("2d");
    if (!gctx) {
      setDone(true);
      return;
    }
    gctx.scale(dpr, dpr);
    drawGrime(gctx, w, h);

    // paint the initial dirty state before the browser shows the frame
    ctx.clearRect(0, 0, w, h);
    ctx.drawImage(grime, 0, 0, w, h);

    const featherT = 150;
    const tStart = -featherT;
    const tEnd = w + h + featherT;
    const duration = 2500;
    const delay = 150;
    const span = Math.hypot(w, h);
    const dir: Pt = { x: Math.SQRT1_2, y: Math.SQRT1_2 };
    const ease = cubicBezier(0.72, 0, 0.2, 1);
    const paintSqueegee = makeSqueegeePainter(ctx, w, h, dir, span);

    let raf = 0;
    let startTime = 0;

    const frame = (now: number) => {
      if (!startTime) startTime = now;
      const elapsed = now - startTime - delay;
      const p = elapsed <= 0 ? 0 : Math.min(elapsed / duration, 1);
      const T = tStart + (tEnd - tStart) * ease(p);

      // repaint pristine grime, then cut away the clean side in a single pass
      // (feathered blade edge). Non-cumulative, so it always ends fully clean.
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(grime, 0, 0, w, h);

      ctx.globalCompositeOperation = "destination-out";
      const e0 = (T - featherT) / 2;
      const e1 = T / 2;
      const grad = ctx.createLinearGradient(e0, e0, e1, e1);
      grad.addColorStop(0, "rgba(0, 0, 0, 1)");
      grad.addColorStop(1, "rgba(0, 0, 0, 0)");
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);
      ctx.globalCompositeOperation = "source-over";

      if (p < 1) {
        paintSqueegee(T - 80);
        raf = requestAnimationFrame(frame);
      } else {
        ctx.clearRect(0, 0, w, h);
        setDone(true);
      }
    };

    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`window-scene${done ? " is-clean" : ""}`}
      aria-hidden="true"
    />
  );
}

function QuoteForm() {
  const [step, setStep] = useState(1);
  const [stepHeight, setStepHeight] = useState<number>();
  const [flashFields, setFlashFields] = useState<string[]>([]);
  const stepContentRef = useRef<HTMLDivElement>(null);
  const [form, setForm] = useState({
    windowCount: "",
    stories: "",
    serviceType: "",
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    streetAddress: "",
    desiredDate: "",
    details: "",
  });

  const updateField = (name: string, value: string | boolean) => {
    setForm((current) => ({ ...current, [name]: value }));
  };

  const handleContinue = () => {
    const missing: string[] = [];
    if (!form.windowCount) missing.push("windowCount");
    if (!form.stories) missing.push("stories");
    if (!form.serviceType) missing.push("serviceType");

    if (missing.length > 0) {
      setFlashFields(missing);
      window.setTimeout(() => setFlashFields([]), 650);
      return;
    }

    setStep(2);
  };

  const contactComplete =
    form.firstName.trim() !== "" &&
    form.lastName.trim() !== "" &&
    form.phone.trim() !== "" &&
    form.email.trim() !== "" &&
    form.streetAddress.trim() !== "" &&
    form.desiredDate !== "";

  const estimateRange = useMemo(() => {
    const windows = Number(form.windowCount);

    if (!windows || !form.serviceType) {
      return "Residential visits start at $190.";
    }

    const rate = form.serviceType === "insideOutside" ? 15 : 10;
    const storyMultiplier = form.stories === "two" ? 1.18 : 1;
    const base = Math.max(190, Math.round(windows * rate * storyMultiplier));
    const low = Math.max(190, Math.round(base * 0.9));
    const high = Math.max(low + 35, Math.round(base * 1.25));

    return `Estimated range: $${low}-$${high}. Final price depends on access, screens, buildup, and window type.`;
  }, [form.serviceType, form.stories, form.windowCount]);

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
  };

  useLayoutEffect(() => {
    const content = stepContentRef.current;

    if (!content) {
      return;
    }

    setStepHeight(content.scrollHeight);
  }, [estimateRange, step]);

  return (
    <form className="quote-card" aria-label="Request a window cleaning quote" onSubmit={handleSubmit}>
      <div className="form-heading">
        <h2>Request a quote</h2>
        <div className="step-track" aria-label={`Step ${step} of 2`}>
          <span className={step >= 1 ? "is-active" : ""} />
          <span className={step >= 2 ? "is-active" : ""} />
        </div>
      </div>

      <div className="step-frame" style={{ height: stepHeight }}>
        <div className="step-content" ref={stepContentRef} key={step}>
          {step === 1 ? (
            <>
              <div className="field-grid">
                <label className={flashFields.includes("windowCount") ? "is-flash" : undefined}>
                  <span>Approximate window count</span>
                  <input
                    name="windowCount"
                    type="number"
                    inputMode="numeric"
                    min="1"
                    value={form.windowCount}
                    onChange={(event) => updateField("windowCount", event.target.value)}
                  />
                </label>
                <label className={flashFields.includes("stories") ? "is-flash" : undefined}>
                  <span>Stories</span>
                  <select
                    name="stories"
                    value={form.stories}
                    onChange={(event) => updateField("stories", event.target.value)}
                  >
                    <option value="">Select</option>
                    <option value="one">One story</option>
                    <option value="two">Two stories</option>
                  </select>
                </label>
              </div>
              <div className={`service-field${flashFields.includes("serviceType") ? " is-flash" : ""}`}>
                <span>Service type</span>
                <div className="segmented-control" role="group" aria-label="Service type">
                  <button
                    type="button"
                    className={form.serviceType === "exterior" ? "is-selected" : ""}
                    aria-pressed={form.serviceType === "exterior"}
                    onClick={() => updateField("serviceType", "exterior")}
                  >
                    Exterior only
                  </button>
                  <button
                    type="button"
                    className={form.serviceType === "insideOutside" ? "is-selected" : ""}
                    aria-pressed={form.serviceType === "insideOutside"}
                    onClick={() => updateField("serviceType", "insideOutside")}
                  >
                    Inside + outside
                  </button>
                </div>
              </div>
              <div className="estimate-note">
                <span className="estimate-icon" aria-hidden="true">$</span>
                <p>{estimateRange}</p>
              </div>
              <button type="button" onClick={handleContinue}>
                Continue
              </button>
            </>
          ) : (
            <>
              <div className="field-grid">
                <label>
                  <span>First name</span>
                  <input
                    name="firstName"
                    type="text"
                    autoComplete="given-name"
                    value={form.firstName}
                    onChange={(event) => updateField("firstName", event.target.value)}
                  />
                </label>
                <label>
                  <span>Last name</span>
                  <input
                    name="lastName"
                    type="text"
                    autoComplete="family-name"
                    value={form.lastName}
                    onChange={(event) => updateField("lastName", event.target.value)}
                  />
                </label>
              </div>
              <div className="field-grid">
                <label>
                  <span>Phone</span>
                  <input
                    name="phone"
                    type="tel"
                    autoComplete="tel"
                    value={form.phone}
                    onChange={(event) => updateField("phone", event.target.value)}
                  />
                </label>
                <label>
                  <span>Email</span>
                  <input
                    name="email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={(event) => updateField("email", event.target.value)}
                  />
                </label>
              </div>
              <label>
                <span>Street address</span>
                <input
                  name="streetAddress"
                  type="text"
                  autoComplete="street-address"
                  value={form.streetAddress}
                  onChange={(event) => updateField("streetAddress", event.target.value)}
                />
              </label>
              <label>
                <span>When do you want the work done by?</span>
                <input
                  name="desiredDate"
                  type="date"
                  value={form.desiredDate}
                  onChange={(event) => updateField("desiredDate", event.target.value)}
                />
              </label>
              <label>
                <span>Anything else we should know?</span>
                <textarea
                  name="details"
                  rows={3}
                  placeholder="Gate codes, service details, problem windows, preferred timing..."
                  value={form.details}
                  onChange={(event) => updateField("details", event.target.value)}
                />
              </label>
              <div className="button-row">
                <button type="button" className="secondary-button" onClick={() => setStep(1)}>
                  Back
                </button>
                <button type="submit" disabled={!contactComplete}>
                  Request a Quote
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </form>
  );
}

function Hero() {
  return (
    <header className="hero" style={{ "--vista": `url(${vistaUrl})` } as CSSProperties}>
      <div className="hero-copy">
        <h2>
          <span>Let the light</span>
          <span>back in.</span>
        </h2>
      </div>

      <div className="brand-lockup">
        <div className="brand-line">
          <img className="brand-mark" src={logoMarkUrl} alt="" aria-hidden="true" />
          <h1>Crystal Blue Window Cleaning</h1>
        </div>
        <p>
          Simple, streak-free window cleaning for brighter homes and clearer
          views.
        </p>
      </div>

      <WindowWipe />

      <div id="quote" className="quote-shell">
        <QuoteForm />
      </div>
    </header>
  );
}

export default function App() {
  return <Hero />;
}
