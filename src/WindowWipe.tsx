import { useLayoutEffect, useRef, useState } from "react";

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
export function WindowWipe() {
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
