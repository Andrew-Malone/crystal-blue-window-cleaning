import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type AnimationEvent,
  type FormEvent,
} from "react";
import logoMarkUrl from "./assets/logo-mark.png";
import houseFrontUrl from "./assets/carousel/house-front.jpg";
import frenchDoorsUrl from "./assets/carousel/french-doors.jpg";
import poleCleaningUrl from "./assets/carousel/pole-cleaning.jpg";
import brickPorchUrl from "./assets/carousel/brick-porch.jpg";

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

  // Tuned for the light seafoam hero behind it: a soft misted-glass film, not
  // the heavy grey haze the old dark photo hero could carry.
  const base = ctx.createLinearGradient(0, 0, w * 0.2, h);
  base.addColorStop(0, "rgba(236, 246, 243, 0.44)");
  base.addColorStop(1, "rgba(163, 188, 184, 0.36)");
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
  dir: Pt,
  span: number,
  simplified: boolean,
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

  // Anchor on the x === y diagonal (the foot of the perpendicular from the
  // (0,0) corner onto the channel line x + y = channelT). The handle rides a
  // little toward the top-left, but it emerges smoothly from the corner the
  // wipe starts in — centring it on the window instead detaches it from that
  // reveal and makes it pop in mid-sweep.
  return (channelT: number) => {
    const cx = channelT / 2;
    const cy = channelT / 2;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(ang);
    ctx.lineCap = "round";

    // soft drop shadow, offset toward the dirty side (no shadowBlur)
    blade(shadowX, simplified ? 16 : 22, "rgba(2, 24, 36, 0.16)");

    // wet gleam at the cleaned contact line — stacked strokes fake the glow.
    // On mobile Safari, skip the stacked highlight strokes; the moving blade is
    // still clear, but per-frame full-length strokes drop from six to three.
    if (!simplified) {
      blade(gleamX, 14, "rgba(255, 255, 255, 0.12)");
      blade(gleamX, 7, "rgba(255, 255, 255, 0.3)");
      blade(gleamX, 3, "rgba(255, 255, 255, 0.6)");
    }

    // metal channel + rubber blade
    blade(0, cw, metal);
    blade(bladeX, 6, "#16242b");

    // T-handle: hidden for now (it rides slightly off-centre on a non-square
    // window). Uncomment to restore it; `neck`/`grip` gradients above feed it.
    // ctx.fillStyle = "rgba(2, 24, 36, 0.16)";
    // roundRect(ctx, -neckLen + 4, -neckW / 2 + 4, neckLen, neckW, 5);
    // ctx.fill();
    // roundRect(ctx, gx + 4, -gripLen / 2 + 4, gripThick, gripLen, 11);
    // ctx.fill();

    // roundRect(ctx, -neckLen, -neckW / 2, neckLen, neckW, 5);
    // ctx.fillStyle = neck;
    // ctx.fill();

    // roundRect(ctx, gx, -gripLen / 2, gripThick, gripLen, 11);
    // ctx.fillStyle = grip;
    // ctx.fill();

    // roundRect(ctx, gx + 4, -gripLen / 2 + 6, 4, gripLen - 12, 2);
    // ctx.fillStyle = "rgba(255, 255, 255, 0.18)";
    // ctx.fill();

    ctx.restore();
  };
}

// Wipes a layer of grime off the hero, revealing the page underneath. There is
// no photo to preload any more — the canvas simply clears to transparent.
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

    let raf = 0;
    let resizeTimer = 0;
    let runToken = 0;
    let hasFinished = false;
    let canvasWidth = 0;
    let canvasHeight = 0;

    const startWipe = () => {
      const token = ++runToken;
      cancelAnimationFrame(raf);
      setDone(false);

      const rect = canvas.getBoundingClientRect();
      const w = rect.width;
      const h = rect.height;
      // The grime layer is procedural noise (smudges, water spots), so high-DPR
      // backing stores are mostly wasted work. Mobile Safari is especially
      // sensitive to this full-hero canvas, so cap coarse-pointer devices lower.
      const isCoarsePointer = window.matchMedia("(pointer: coarse)").matches;
      const dprCap = isCoarsePointer ? 1 : 1.5;
      const dpr = Math.min(window.devicePixelRatio || 1, dprCap);
      canvasWidth = w;
      canvasHeight = h;
      canvas.width = Math.round(w * dpr);
      canvas.height = Math.round(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

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

      // paint the initial dirty state before the wipe starts moving
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
      const paintSqueegee = makeSqueegeePainter(ctx, dir, span, isCoarsePointer);
      const featherWidth = featherT / Math.SQRT2;
      const featherHeight = span * 2;
      const feather = document.createElement("canvas");
      feather.width = Math.ceil(featherWidth * dpr);
      feather.height = Math.ceil(featherHeight * dpr);
      const fctx = feather.getContext("2d");

      if (!fctx) {
        setDone(true);
        return;
      }

      fctx.scale(dpr, dpr);
      const featherFade = fctx.createLinearGradient(0, 0, featherWidth, 0);
      featherFade.addColorStop(0, "rgba(0, 0, 0, 1)");
      featherFade.addColorStop(1, "rgba(0, 0, 0, 0)");
      fctx.fillStyle = featherFade;
      fctx.fillRect(0, 0, featherWidth, featherHeight);

      let startTime = 0;
      // The reveal is monotonic: everything behind `cleanEdge` is permanently
      // transparent and everything ahead is the static grime bitmap, drawn once
      // below. Only the strip swept since the last frame actually changes, so we
      // clip every per-frame repaint to a band that spans from the previous
      // clean edge to just past the current feather + squeegee. Output is
      // pixel-identical to a full repaint (the grime is a constant bitmap drawn
      // at the same position), but the per-frame fill shrinks from the whole
      // canvas to that band. `bandPad` covers the squeegee strokes that ride
      // ahead of the feather plus a margin for the clip's antialiased edge.
      const bandPad = 64;
      const c = Math.SQRT1_2; // cos(45deg) === sin(45deg)
      // rotated-frame (x along the wipe direction) -> base canvas coords
      const toBaseX = (x: number, y: number) => c * (x - y);
      const toBaseY = (x: number, y: number) => c * (x + y);
      let prevCleanEdge = -span * 2;

      // initial pristine grime — drawn once; later frames only patch the band
      ctx.clearRect(0, 0, w, h);
      ctx.drawImage(grime, 0, 0, w, h);

      const frame = (now: number) => {
        if (token !== runToken) {
          return;
        }

        if (!startTime) startTime = now;
        const elapsed = now - startTime - delay;
        const p = elapsed <= 0 ? 0 : Math.min(elapsed / duration, 1);
        const T = tStart + (tEnd - tStart) * ease(p);
        const cleanEdge = (T - featherT) / Math.SQRT2;

        // band along the wipe direction: [bx0, bx1] x [-span, span] (rotated)
        const bx0 = prevCleanEdge - bandPad;
        const bx1 = cleanEdge + featherWidth + bandPad;

        ctx.save();
        // clip to the rotated band, expressed as a polygon in base coords so we
        // can draw the (axis-aligned) grime without churning the transform
        ctx.beginPath();
        ctx.moveTo(toBaseX(bx0, -span), toBaseY(bx0, -span));
        ctx.lineTo(toBaseX(bx1, -span), toBaseY(bx1, -span));
        ctx.lineTo(toBaseX(bx1, span), toBaseY(bx1, span));
        ctx.lineTo(toBaseX(bx0, span), toBaseY(bx0, span));
        ctx.closePath();
        ctx.clip();

        // rebuild the band from scratch: pristine grime, then cut the clean side
        // in a single pass (feathered blade edge) — non-cumulative within the
        // band, so it always resolves fully clean.
        ctx.clearRect(0, 0, w, h);
        ctx.drawImage(grime, 0, 0, w, h);

        ctx.globalCompositeOperation = "destination-out";
        ctx.rotate(Math.PI / 4);
        ctx.fillStyle = "rgba(0, 0, 0, 1)";
        ctx.fillRect(-span * 2, -span, span * 2 + cleanEdge, featherHeight);
        ctx.drawImage(feather, cleanEdge, -span, featherWidth, featherHeight);
        ctx.globalCompositeOperation = "source-over";
        ctx.restore();

        if (p < 1) {
          paintSqueegee(T - 80);
          prevCleanEdge = cleanEdge;
          raf = requestAnimationFrame(frame);
        } else {
          hasFinished = true;
          ctx.clearRect(0, 0, w, h);
          setDone(true);
        }
      };

      raf = requestAnimationFrame(frame);
    };

    const resizeObserver = new ResizeObserver(() => {
      if (hasFinished) {
        return;
      }

      const rect = canvas.getBoundingClientRect();
      if (
        Math.abs(rect.width - canvasWidth) < 1 &&
        Math.abs(rect.height - canvasHeight) < 1
      ) {
        return;
      }

      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(startWipe, 120);
    });

    resizeObserver.observe(canvas);
    startWipe();

    return () => {
      runToken += 1;
      resizeObserver.disconnect();
      window.clearTimeout(resizeTimer);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className={`window-scene${done ? " is-clean" : ""}`}
      aria-hidden="true"
    />
  );
}

// The qualifying step (window count, stories, service type) is parked: the
// form's job is to capture contact details and an address. Set this back to 1
// to restore the two-step flow — the step state, the animated step frame, the
// progress track and the Back button are all still wired up.
const FIRST_STEP: number = 2;
const IS_MULTI_STEP = FIRST_STEP === 1;

function QuoteForm() {
  const [step, setStep] = useState(FIRST_STEP);
  const [stepHeight, setStepHeight] = useState<number>();
  const [flashFields, setFlashFields] = useState<string[]>([]);
  const [cardEntered, setCardEntered] = useState(false);
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "sent" | "error">("idle");
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
    form.streetAddress.trim() !== "" &&
    form.desiredDate !== "";

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const endpoint = import.meta.env.VITE_FORMSPREE_ENDPOINT as string | undefined;
    if (!endpoint) {
      console.error("VITE_FORMSPREE_ENDPOINT is not configured");
      setSubmitState("error");
      return;
    }

    setSubmitState("sending");

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      setSubmitState(response.ok ? "sent" : "error");
    } catch {
      setSubmitState("error");
    }
  };

  const handleCardAnimationEnd = (event: AnimationEvent<HTMLFormElement>) => {
    if (event.animationName === "quoteEnter") {
      setCardEntered(true);
    }
  };

  useLayoutEffect(() => {
    const content = stepContentRef.current;

    if (!content) {
      return;
    }

    // A one-shot scrollHeight read goes stale if a web font swap or other
    // async reflow resizes the content after this runs (more likely on a
    // slow mobile connection), leaving the frame clipped below its real
    // height. Keep tracking it for as long as this step is mounted.
    const observer = new ResizeObserver(([entry]) => {
      setStepHeight(entry.target.scrollHeight);
    });
    observer.observe(content);

    return () => observer.disconnect();
  }, [step]);

  return (
    <form
      className={`quote-card${cardEntered ? " is-entered" : ""}`}
      aria-label="Request a window cleaning quote"
      onAnimationEnd={handleCardAnimationEnd}
      onSubmit={handleSubmit}
    >
      <div className="form-heading">
        <h2>Request a visit</h2>
        {IS_MULTI_STEP ? (
          <div className="step-track" aria-label={`Step ${step} of 2`}>
            <span className={step >= 1 ? "is-active" : ""} />
            <span className={step >= 2 ? "is-active" : ""} />
          </div>
        ) : null}
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
                  <span>Email (optional)</span>
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
                <span>Anything else we should know? (optional)</span>
                <textarea
                  name="details"
                  rows={3}
                  placeholder="Gate codes, service details, problem windows, preferred timing..."
                  value={form.details}
                  onChange={(event) => updateField("details", event.target.value)}
                />
              </label>
              {submitState === "sent" ? (
                <p className="form-status">
                  Thanks! We received your request and will reach out shortly to confirm.
                </p>
              ) : (
                <>
                  <div
                    className={`button-row${IS_MULTI_STEP ? "" : " button-row--single"}`}
                  >
                    {IS_MULTI_STEP ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => setStep(1)}
                        disabled={submitState === "sending"}
                      >
                        Back
                      </button>
                    ) : null}
                    <button type="submit" disabled={!contactComplete || submitState === "sending"}>
                      {submitState === "sending" ? "Sending..." : "Request a Visit"}
                    </button>
                  </div>
                  {submitState === "error" ? (
                    <p className="form-status form-status--error">
                      Something went wrong sending your request. Please call or text us instead.
                    </p>
                  ) : null}
                </>
              )}
            </>
          )}
        </div>
      </div>
    </form>
  );
}

// Minimal history-API router. The site is three pages, so this is cheaper than
// pulling in a routing library; Cloudflare already serves the SPA fallback for
// deep links (see wrangler.jsonc `not_found_handling`).
function usePath() {
  const [path, setPath] = useState(() => window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (next: string) => {
    if (next !== window.location.pathname) {
      window.history.pushState({}, "", next);
      setPath(next);
    }
    window.scrollTo(0, 0);
  };

  return { path, navigate };
}

function PageLink({
  to,
  navigate,
  className,
  children,
}: {
  to: string;
  navigate: (path: string) => void;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <a
      href={to}
      className={className}
      onClick={(event) => {
        // Let the browser handle modified clicks (new tab, download, etc.).
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        event.preventDefault();
        navigate(to);
      }}
    >
      {children}
    </a>
  );
}

function SiteNav({ navigate }: { navigate: (path: string) => void }) {
  return (
    <nav className="site-nav" aria-label="Main">
      <div className="nav-links">
        <SectionLink id="about" navigate={navigate}>
          Who We Are
        </SectionLink>
        <a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener noreferrer">
          Reviews
        </a>
      </div>

      <a
        className="brand"
        href="/"
        onClick={(event) => {
          if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
            return;
          }
          event.preventDefault();
          navigate("/");
        }}
      >
        <span className="brand-mark" aria-hidden="true">
          <img src={logoMarkUrl} alt="" />
        </span>
        <span className="brand-name">
          <b>Dolphin Bay</b>
          <span>Window Cleaning</span>
        </span>
      </a>

      <div className="nav-links nav-links--right">
        <PageLink to="/faq" navigate={navigate}>
          FAQ
        </PageLink>
        <a href="#contact">Contact</a>
      </div>
    </nav>
  );
}

const FAQS: { q: string; a: string }[] = [
  {
    q: "What areas do you serve?",
    a: "The greater Pensacola area. If you're not sure whether you're in range, give us a call and we'll let you know.",
  },
  {
    q: "Do you do commercial work?",
    a: "Yes. We clean offices and storefronts too, and we can come before you open or after you close so we're not in anyone's way.",
  },
  {
    q: "Are you licensed and insured?",
    a: "Yes, both.",
  },
  {
    q: "Is your cleaning system safe for my plants and pets?",
    a: "Yes. We clean with purified, deionized water, so there's nothing in the runoff that will hurt your yard or your animals.",
  },
  {
    q: "Can you reach second-story windows?",
    a: "Yes. Our water-fed pole reaches 40 feet, which covers second-story windows with room to spare.",
  },
  {
    q: "How often should I have my windows cleaned?",
    a: "For most homes, about every six months.",
  },
];

function FaqPage({ navigate }: { navigate: (path: string) => void }) {
  return (
    <section className="faq">
      <div className="faq-inner">
        <PageLink to="/" navigate={navigate} className="back-link">
          <span aria-hidden="true">←</span> Back to home
        </PageLink>

        <h1>Frequently asked questions</h1>

        <dl className="faq-list">
          {FAQS.map(({ q, a }) => (
            <div key={q} className="faq-item">
              <dt>{q}</dt>
              <dd>{a}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}

// Links to a section of the home page. From another page it switches to home
// first, then scrolls once the section has rendered.
function SectionLink({
  id,
  navigate,
  children,
}: {
  id: string;
  navigate: (path: string) => void;
  children: React.ReactNode;
}) {
  return (
    <a
      href={`/#${id}`}
      onClick={(event) => {
        if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
          return;
        }
        event.preventDefault();
        if (window.location.pathname !== "/") {
          navigate("/");
        }
        requestAnimationFrame(() => {
          document.getElementById(id)?.scrollIntoView();
        });
      }}
    >
      {children}
    </a>
  );
}

// Opens the Maps listing on its reviews tab (the !9m1!1b1 part of the data).
const GOOGLE_REVIEWS_URL =
  "https://www.google.com/maps/place/Gulf+Line+Window+Cleaning/@30.4851338,-87.2162395,11z/data=!4m8!3m7!1s0x826d2905b1efe7a1:0xdb37ca3cce2c7cd9!8m2!3d30.4849415!4d-87.0514285!9m1!1b1!16s%2Fg%2F11z8tnlj5r";
const FACEBOOK_URL = "https://www.facebook.com/people/Dolphin-Bay-Window-Cleaning/61592673747370/";

function StarRow() {
  return (
    <span className="stars" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 24 24">
          <path d="M12 2.6l2.9 5.88 6.5.95-4.7 4.58 1.11 6.47L12 17.43l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95L12 2.6z" />
        </svg>
      ))}
    </span>
  );
}

function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}

function PhoneIcon() {
  return (
    <svg className="contact-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"
      />
    </svg>
  );
}

function MailIcon() {
  return (
    <svg className="contact-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4.2-8 4.8-8-4.8V6l8 4.8L20 6v2.2z"
      />
    </svg>
  );
}

function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

function QuoteButton({ onQuote }: { onQuote: () => void }) {
  return (
    <button type="button" className="quote-button" onClick={onQuote}>
      <span>Get quote</span>
      <span className="quote-button-icon" aria-hidden="true">
        <ArrowIcon />
      </span>
    </button>
  );
}

// Each slide is one or more photos. Portrait shots go in pairs so they sit
// side by side and fill the landscape frame instead of letterboxing.
const HERO_SLIDES: { src: string; alt: string }[][] = [
  [{ src: houseFrontUrl, alt: "Front of a two-story home with sparkling dormer and porch windows" }],
  [
    { src: frenchDoorsUrl, alt: "Cleaning French doors with a water-fed pole" },
    { src: poleCleaningUrl, alt: "Cleaning second-story windows with a water-fed pole" },
  ],
  [{ src: brickPorchUrl, alt: "Clean French doors and windows along a brick porch" }],
];

const SLIDE_INTERVAL_MS = 6000;

function ChevronIcon({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const count = HERO_SLIDES.length;
  const go = (next: number) => setIndex((next + count) % count);

  // Auto-advance, unless the visitor is interacting with it or has asked
  // for reduced motion. Re-keyed on index so a manual change resets the timer.
  useEffect(() => {
    if (paused || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % count), SLIDE_INTERVAL_MS);
    return () => window.clearTimeout(id);
  }, [index, paused, count]);

  return (
    <section
      className="hero-media hero-carousel"
      aria-roledescription="carousel"
      aria-label="Recent work"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {HERO_SLIDES.map((photos, i) => (
        <div
          key={i}
          className={`carousel-slide${i === index ? " is-active" : ""}`}
          role="group"
          aria-roledescription="slide"
          aria-label={`${i + 1} of ${count}`}
          aria-hidden={i !== index}
          style={{ gridTemplateColumns: `repeat(${photos.length}, minmax(0, 1fr))` }}
        >
          {photos.map((photo) => (
            <img
              key={photo.src}
              src={photo.src}
              alt={photo.alt}
              loading={i === 0 ? "eager" : "lazy"}
            />
          ))}
        </div>
      ))}

      <button
        type="button"
        className="carousel-arrow carousel-arrow--prev"
        aria-label="Previous photo"
        onClick={() => go(index - 1)}
      >
        <ChevronIcon dir="prev" />
      </button>
      <button
        type="button"
        className="carousel-arrow carousel-arrow--next"
        aria-label="Next photo"
        onClick={() => go(index + 1)}
      >
        <ChevronIcon dir="next" />
      </button>

      <div className="carousel-dots">
        {HERO_SLIDES.map((_, i) => (
          <button
            key={i}
            type="button"
            className={i === index ? "is-active" : undefined}
            aria-label={`Show photo ${i + 1}`}
            aria-current={i === index}
            onClick={() => go(i)}
          />
        ))}
      </div>
    </section>
  );
}

function Hero({ onQuote }: { onQuote: () => void }) {
  return (
    <header id="top" className="hero">
      <HeroCarousel />

      <div className="hero-inner">
        <h1>
          Your Pane is
          <em>Our Pleasure</em>
        </h1>
        <p className="hero-sub">
          Our goal is to provide quality, satisfying service to Greater
          Pensacola residents. We believe showing up on time matters, and we
          treat every customer with the respect you deserve.
        </p>

        <div className="hero-social">
          <a
            className="hero-rating"
            href={GOOGLE_REVIEWS_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <StarRow />
            <b aria-label="Rated 5 out of 5 stars">5.0</b>
            <span className="rating-label">Read our Google reviews</span>
          </a>
          <a
            className="hero-facebook"
            href={FACEBOOK_URL}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Dolphin Bay Window Cleaning on Facebook"
          >
            <FacebookIcon />
          </a>
        </div>

        <QuoteButton onQuote={onQuote} />
      </div>

      <p className="hero-caption">🇹🇭 The Gulf of Thailand, home of the original Dolphin Bay.</p>

      {/* On-load squeegee wipe, disabled for now. The component and its styles
          are intact — re-render <WindowWipe /> here to bring it back. */}
    </header>
  );
}

// Copied from the Google listing, all five stars. Nancy's is excerpted (the
// full text is on Google); keep the wording as written.
const REVIEWS: { name: string; text: string }[] = [
  {
    name: "Reddoch Graphics",
    text: "Ian and Oliver did a GREAT job on our exterior windows, screens, really thorough, really nice guys.",
  },
  {
    name: "Nancy Brown",
    text: "I wish there were more stars to give these guys! They were so professional, efficient, and my windows have never ever looked better! … Do not hesitate or think twice about hiring them!",
  },
  {
    name: "Caron Majors",
    text: "Ian and Oliver, the window guys…\nDo a great job; I tell you no lies.\nI now see my neighbors; my word you can trust.\nDon't dilly or dally; hire them you must!",
  },
];

function Reviews() {
  return (
    <section id="reviews" className="reviews" aria-label="Customer reviews">
      <div className="reviews-inner">
        <div className="reviews-grid">
          {REVIEWS.map(({ name, text }) => (
            <figure key={name} className="review-card">
              <span className="review-stars" aria-label="5 out of 5 stars">
                <StarRow />
              </span>
              <blockquote>{text}</blockquote>
              <figcaption>
                <a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener noreferrer">
                  {name}
                </a>
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function About() {
  return (
    <section id="about" className="about" aria-label="About Dolphin Bay Window Cleaning">
      <div className="about-inner">
        <h2>Who We Are</h2>
        <p className="about-lede">
          We're Ian and Oliver. We started Dolphin Bay because we were tired
          of contractors who show up late, or not at all, and call that good
          enough. You should know the people working on your home or business,
          and you should be able to count on them. When we say we'll be there,
          we're there. And our cleaning is excellent every time.
        </p>

        <div className="about-grid">
          <div className="about-point">
            <h3>Pure water</h3>
            <p>
              We clean with deionized water. With the minerals filtered out,
              there's nothing left behind to spot, so your glass dries clear.
            </p>
          </div>
          <div className="about-point">
            <h3>Commercial and residential</h3>
            <p>
              Single-story and two-story homes, offices, and retail spaces — we
              quote exterior-only or full inside-and-out cleans either way.
            </p>
          </div>
          <div className="about-point">
            <h3>Licensed and insured</h3>
            <p>
              We're local, not a franchise call center. You talk to the
              person who's actually doing the work.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function Contact({ onQuote }: { onQuote: () => void }) {
  return (
    <section id="contact" className="contact" aria-label="Contact Dolphin Bay Window Cleaning">
      <div className="contact-inner">
        <div className="contact-main">
          <div className="contact-details">
            <a className="contact-phone" href="tel:+18503902894">
              <PhoneIcon />
              (850) 390-2894
            </a>
            <a
              className="contact-email"
              href="mailto:hello@dolphinbaywindowcleaning.com"
            >
              <MailIcon />
              hello@dolphinbaywindowcleaning.com
            </a>
          </div>

          <QuoteButton onQuote={onQuote} />
        </div>

        <footer className="site-footer">
          <p>© {new Date().getFullYear()} Dolphin Bay Window Cleaning</p>
          <p>Serving the greater Pensacola area</p>
          {/* The hero background is CC BY 4.0, which requires this credit. */}
          <p className="footer-credit">
            Background photo:{" "}
            <a
              href="https://commons.wikimedia.org/wiki/File:Mu_Ko_Ang_Thong,_Panoramic_view,_Thailand.jpg"
              target="_blank"
              rel="noopener noreferrer"
            >
              Vyacheslav Argenberg
            </a>
            ,{" "}
            <a
              href="https://creativecommons.org/licenses/by/4.0/"
              target="_blank"
              rel="noopener noreferrer"
            >
              CC BY 4.0
            </a>
          </p>
        </footer>
      </div>
    </section>
  );
}

function QuoteDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  return (
    <dialog
      ref={dialogRef}
      className="quote-dialog"
      aria-label="Request a window cleaning quote"
      onClose={onClose}
      // Clicking the backdrop targets the <dialog> itself, not the card inside.
      onClick={(event) => {
        if (event.target === dialogRef.current) onClose();
      }}
    >
      {open ? (
        <div className="quote-card-shell">
          <QuoteForm />
          <button
            type="button"
            className="dialog-close"
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>
      ) : null}
    </dialog>
  );
}

export default function App() {
  const [quoteOpen, setQuoteOpen] = useState(false);
  const openQuote = () => setQuoteOpen(true);
  const closeQuote = () => setQuoteOpen(false);
  const { path, navigate } = usePath();

  return (
    <>
      <SiteNav navigate={navigate} />

      {path === "/faq" ? (
        <FaqPage navigate={navigate} />
      ) : (
        <>
          <Hero onQuote={openQuote} />
          <Reviews />
          <About />
        </>
      )}

      <Contact onQuote={openQuote} />
      <QuoteDialog open={quoteOpen} onClose={closeQuote} />
    </>
  );
}
