import { useEffect, useRef, useState } from "react";
import { GOOGLE_REVIEWS_URL, FACEBOOK_URL, PHONE_DISPLAY, PHONE_TEL, FacebookIcon, PhoneIcon, PlanIcon, QuoteButton, StarRow } from "../shared";
import workDemoUrl from "../assets/carousel/work-demo.mp4";
import workDemoPosterUrl from "../assets/carousel/work-demo-poster.webp";

// Every carousel photo and its blur-up placeholder, keyed by file path.
// scripts/carousel-images.sh (npm run images) makes the width variants and
// placeholders from the full-size originals; carouselPhoto() below picks
// them up by name. Eager globs are plain asset imports, so Vite fingerprints
// each file and inlines the tiny placeholders as data: URIs.
const CAROUSEL_FILES = import.meta.glob<string>("../assets/carousel/*.webp", {
  eager: true,
  import: "default",
});
const PLACEHOLDER_FILES = import.meta.glob<string>("../assets/placeholders/*.webp", {
  eager: true,
  import: "default",
});

// How much of the carousel a photo spans, as the browser needs it for srcset:
// the full frame, or half of it (a stacked pair). Under 940px the hero is one
// column and the carousel is the viewport minus the gutters; above it the
// carousel is the hero's left column, about half the viewport.
const PHOTO_SIZES = {
  full: "(max-width: 940px) 90vw, calc(50vw - 90px)",
  half: "(max-width: 940px) 45vw, calc(25vw - 45px)",
};
// The widths scripts/carousel-images.sh makes for each span. The original is
// the last candidate.
const PHOTO_WIDTHS = {
  full: [640, 960, 1280],
  half: [450, 600, 900],
};

type HeroPhoto = { src: string; srcSet: string; sizes: string; alt: string; placeholder: string };

function carouselPhoto(name: string, span: keyof typeof PHOTO_SIZES, alt: string): HeroPhoto {
  const file = (suffix: string) => {
    const url = CAROUSEL_FILES[`../assets/carousel/${name}${suffix}.webp`];
    if (!url) throw new Error(`Missing carousel photo ${name}${suffix}.webp; run npm run images`);
    return url;
  };
  const placeholder = PLACEHOLDER_FILES[`../assets/placeholders/${name}.webp`];
  if (!placeholder) throw new Error(`Missing placeholder for ${name}; run npm run images`);
  const widths = PHOTO_WIDTHS[span];
  const original = widths[widths.length - 1];
  return {
    src: file(""),
    srcSet: widths.map((w) => `${w === original ? file("") : file(`-${w}`)} ${w}w`).join(", "),
    sizes: PHOTO_SIZES[span],
    alt,
    placeholder,
  };
}

// Each slide is one or more photos. Portrait shots go in pairs so they sit
// side by side and fill the landscape frame instead of letterboxing.
// The carousel starts its 0.7s crossfade this long before the clip reaches its
// end (9.5s, where it would jump back to the start), measured off the video's
// own clock. timeupdate only fires about four times a second, so this leaves
// room for that lag.
const VIDEO_FADE_LEAD_S = 1.3;

// Photos stack top to bottom; with a video, they sit beside it instead.
type HeroStackSlide = {
  video?: { src: string; poster: string };
  stacked: HeroPhoto[];
  durationMs?: number;
};

// Retired from the carousel (files kept in src/assets/carousel/french-doors.jpg,
// src/assets/carousel/clean-door.jpg and src/assets/carousel/house-front.jpg).
// To bring one back, convert it to webp in that folder, add its name to
// scripts/carousel-images.sh, run npm run images, and add a slide such as
//   [carouselPhoto("house-front", "full", "A clean house front")],
const HERO_SLIDES: (HeroPhoto[] | HeroStackSlide)[] = [
  {
    video: { src: workDemoUrl, poster: workDemoPosterUrl },
    // Normally the video itself triggers the crossfade (see SlideVideo). This
    // is only a backstop if it never plays, e.g. autoplay blocked.
    durationMs: 14000,
    stacked: [
      carouselPhoto("lamp-before", "half", "Before: a brick-mounted lantern with dusty, cloudy glass"),
      carouselPhoto("lamp-after", "half", "After: the same lantern with clear, clean glass"),
    ],
  },
  {
    stacked: [
      carouselPhoto("windows-before", "full", "Before: dusty, cloudy upper-story casement windows"),
      carouselPhoto("windows-after", "full", "After: the same windows, clear and reflecting the sky"),
    ],
  },
  [
    carouselPhoto("pole-ground", "half", "Cleaning a ground-floor window with a water-fed pole"),
    carouselPhoto("pole-cleaning", "half", "Cleaning second-story windows with a water-fed pole"),
  ],
  [carouselPhoto("brick-porch", "full", "Clean French doors and windows along a brick porch")],
  [carouselPhoto("team", "full", "The three Dolphin Bay window cleaners standing side by side in front of a home")],
];

const SLIDE_INTERVAL_MS = 6000;

// A carousel photo over its blurred placeholder. The photo fades in once it
// has loaded instead of painting top-down as the bytes arrive. Until `load`,
// only the placeholder shows (no src, so nothing is fetched).
function CarouselPhoto({ photo, eager, load }: { photo: HeroPhoto; eager: boolean; load: boolean }) {
  const ref = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);
  // The first slide is in the prerendered HTML and can finish loading before
  // React takes over, so its load event never reaches onLoad: check on mount.
  useEffect(() => {
    const img = ref.current;
    if (img && img.complete && img.naturalWidth > 0) setLoaded(true);
  }, [load]);
  return (
    <span className="carousel-photo" style={{ backgroundImage: `url(${photo.placeholder})` }}>
      <img
        ref={ref}
        className={loaded ? "is-loaded" : undefined}
        src={load ? photo.src : undefined}
        srcSet={load ? photo.srcSet : undefined}
        sizes={photo.sizes}
        alt={photo.alt}
        decoding="async"
        loading={eager ? "eager" : "lazy"}
        fetchPriority={eager ? "high" : undefined}
        onLoad={() => setLoaded(true)}
      />
    </span>
  );
}

function ChevronIcon({ dir }: { dir: "prev" | "next" }) {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d={dir === "prev" ? "M15 5l-7 7 7 7" : "M9 5l7 7-7 7"} />
    </svg>
  );
}

// A swipe must travel this far to turn the page...
const SWIPE_MIN_PX = 40;
// ...and the drag's direction is judged after this much movement. Anything
// within roughly 50 degrees of horizontal counts as a swipe (bias 0.85 =
// tan 40 degrees), so a slightly slanted thumb still turns the slide.
const SWIPE_LOCK_PX = 8;
// A press that moves less than this is a tap, not a drag.
const TAP_MAX_PX = 10;
const SWIPE_SIDEWAYS_BIAS = 0.85;

// Muted, looping clip that only plays while its slide is showing.
function SlideVideo({
  src,
  poster,
  active,
  onNearEnd,
  onBlockedChange,
}: {
  src: string;
  poster: string;
  active: boolean;
  // Called once per showing, shortly before the clip reaches its end.
  onNearEnd: () => void;
  // true when the browser refused to autoplay (e.g. iPhone Low Power Mode),
  // false once the clip is actually playing.
  onBlockedChange: (blocked: boolean) => void;
}) {
  const ref = useRef<HTMLVideoElement>(null);
  const firedRef = useRef(false);
  const blockedRef = useRef(onBlockedChange);
  blockedRef.current = onBlockedChange;

  // iOS only autoplays a video whose muted *attribute* is set; React sets the
  // property alone (and server-rendered HTML omits it), so set both by hand.
  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    video.muted = true;
    video.setAttribute("muted", "");
    video.setAttribute("playsinline", "");
  }, []);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;
    if (active) {
      firedRef.current = false;
      video.currentTime = 0;
      video.play().catch(() => blockedRef.current(true));
      return;
    }
    // Keep it playing through the crossfade (700ms in CSS), then stop it.
    const id = window.setTimeout(() => video.pause(), 800);
    return () => window.clearTimeout(id);
  }, [active]);

  return (
    <div className="stack-cell">
      <video
        ref={ref}
        src={src}
        poster={poster}
        muted
        loop
        autoPlay={active}
        playsInline
        preload="auto"
        aria-hidden="true"
        onPlaying={() => blockedRef.current(false)}
        onTimeUpdate={(e) => {
          const v = e.currentTarget;
          if (!active || firedRef.current || !v.duration) return;
          if (v.currentTime >= v.duration - VIDEO_FADE_LEAD_S) {
            firedRef.current = true;
            onNearEnd();
          }
        }}
      />
    </div>
  );
}

function HeroCarousel() {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  // Off screen, the carousel stops entirely: no video decoding and no
  // crossfades the visitor can't see, both of which cost scroll smoothness
  // on a phone.
  const [visible, setVisible] = useState(true);
  // Once someone swipes to a photo, stop auto-advancing away from it.
  const [swiped, setSwiped] = useState(false);
  // The video slide can't time itself off a video that isn't playing.
  const [videoBlocked, setVideoBlocked] = useState(false);
  const count = HERO_SLIDES.length;
  const go = (next: number) => setIndex((next + count) % count);

  // Photos load as the carousel reaches them: the showing slide right away,
  // the one after it once the page's own load has finished (so it doesn't
  // compete with the first slide's photos and video), then each next one as
  // its predecessor shows. The hidden slides sit in the same grid cell as the
  // visible one, so loading="lazy" alone would fetch every photo on page load.
  const [reach, setReach] = useState(0);
  useEffect(() => {
    setReach((r) => Math.max(r, index));
    const ahead = () => setReach((r) => Math.max(r, index + 1));
    if (document.readyState === "complete") {
      ahead();
      return;
    }
    window.addEventListener("load", ahead, { once: true });
    return () => window.removeEventListener("load", ahead);
  }, [index]);

  // Auto-advance, unless the visitor is interacting with it or has asked
  // for reduced motion. Re-keyed on index so a manual change resets the timer.
  useEffect(() => {
    if (
      paused ||
      !visible ||
      swiped ||
      window.matchMedia("(prefers-reduced-motion: reduce)").matches
    ) {
      return;
    }
    const current = HERO_SLIDES[index];
    const delay =
      (!Array.isArray(current) && !videoBlocked && current.durationMs) || SLIDE_INTERVAL_MS;
    const id = window.setTimeout(() => setIndex((i) => (i + 1) % count), delay);
    return () => window.clearTimeout(id);
  }, [index, paused, visible, swiped, count, videoBlocked]);

  // Phones swipe instead of using the arrows (hidden on touch screens in CSS).
  // The first few pixels of movement decide the gesture: leaning sideways
  // claims it for the carousel, mostly vertical is a page scroll. Every
  // listener is passive: the CSS touch-action on the carousel already keeps a
  // sideways drag from scrolling anything, and a non-passive touchmove made
  // Safari wait on JavaScript for each finger movement that started here.
  const sectionRef = useRef<HTMLElement>(null);
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => setVisible(entry.isIntersecting), {
      rootMargin: "100px 0px",
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let gesture: { x: number; y: number; axis: "x" | "y" | null } | null = null;

    const onStart = (e: TouchEvent) => {
      const t = e.touches[0];
      gesture = e.touches.length === 1 ? { x: t.clientX, y: t.clientY, axis: null } : null;
    };
    const onMove = (e: TouchEvent) => {
      if (!gesture || e.touches.length !== 1) return;
      const t = e.touches[0];
      const dx = t.clientX - gesture.x;
      const dy = t.clientY - gesture.y;
      if (!gesture.axis && Math.hypot(dx, dy) > SWIPE_LOCK_PX) {
        gesture.axis = Math.abs(dx) > Math.abs(dy) * SWIPE_SIDEWAYS_BIAS ? "x" : "y";
      }
    };
    const onEnd = (e: TouchEvent) => {
      const g = gesture;
      gesture = null;
      if (!g || g.axis !== "x") return;
      const dx = e.changedTouches[0].clientX - g.x;
      if (Math.abs(dx) < SWIPE_MIN_PX) return;
      setSwiped(true);
      setIndex((i) => (i + (dx < 0 ? 1 : -1) + count) % count);
    };
    const onCancel = () => {
      gesture = null;
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: true });
    el.addEventListener("touchend", onEnd);
    el.addEventListener("touchcancel", onCancel);
    return () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onCancel);
    };
  }, [count]);

  // Mice drag the same way. The browser's own image drag has to be switched off
  // or it picks the photo up instead of turning the page.
  useEffect(() => {
    const el = sectionRef.current;
    if (!el) return;
    let startX: number | null = null;
    let startY = 0;

    const onDown = (e: MouseEvent) => {
      if (e.button !== 0 || (e.target as Element).closest("button")) return;
      startX = e.clientX;
      startY = e.clientY;
    };
    const onUp = (e: MouseEvent) => {
      if (startX === null) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      startX = null;
      if (Math.abs(dx) < SWIPE_MIN_PX || Math.abs(dx) < Math.abs(dy) * SWIPE_SIDEWAYS_BIAS) return;
      setSwiped(true);
      setIndex((i) => (i + (dx < 0 ? 1 : -1) + count) % count);
    };
    const onDragStart = (e: Event) => e.preventDefault();

    // A mouse click with no drag: right half goes forward, left half back.
    let downX = 0;
    let downY = 0;
    const onPress = (e: MouseEvent) => {
      downX = e.clientX;
      downY = e.clientY;
    };
    const onClick = (e: MouseEvent) => {
      // Touch screens only swipe; tapping does nothing (and leaves the phone's
      // own video controls alone).
      if (window.matchMedia("(hover: none), (pointer: coarse)").matches) return;
      if ((e.target as Element).closest("button")) return;
      // Clicking a paused video plays it rather than turning the slide.
      const tappedVideo = (e.target as Element).closest("video");
      if (tappedVideo && tappedVideo.paused) {
        tappedVideo.play().catch(() => {});
        return;
      }
      if (Math.hypot(e.clientX - downX, e.clientY - downY) > TAP_MAX_PX) return;
      const rect = el.getBoundingClientRect();
      const forward = e.clientX - rect.left >= rect.width / 2;
      setSwiped(true);
      setIndex((i) => (i + (forward ? 1 : -1) + count) % count);
    };

    el.addEventListener("mousedown", onPress);
    el.addEventListener("click", onClick);
    el.addEventListener("mousedown", onDown);
    el.addEventListener("dragstart", onDragStart);
    window.addEventListener("mouseup", onUp);
    return () => {
      el.removeEventListener("mousedown", onPress);
      el.removeEventListener("click", onClick);
      el.removeEventListener("mousedown", onDown);
      el.removeEventListener("dragstart", onDragStart);
      window.removeEventListener("mouseup", onUp);
    };
  }, [count]);

  return (
    <section
      ref={sectionRef}
      className="hero-media hero-carousel"
      aria-roledescription="carousel"
      aria-label="Recent work"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      {HERO_SLIDES.map((slide, i) => {
        const photos = Array.isArray(slide) ? slide : slide.stacked;
        const isStack = !Array.isArray(slide);
        const video = Array.isArray(slide) ? undefined : slide.video;
        const renderPhoto = (photo: HeroPhoto) => (
          <CarouselPhoto key={photo.src} photo={photo} eager={i === 0} load={i <= reach} />
        );
        return (
          <div
            key={i}
            className={`carousel-slide${i === index ? " is-active" : ""}${isStack ? " carousel-slide--stack" : ""}${video ? " carousel-slide--video" : ""}`}
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} of ${count}`}
            aria-hidden={i !== index}
            style={
              isStack ? undefined : { gridTemplateColumns: `repeat(${photos.length}, minmax(0, 1fr))` }
            }
          >
            {isStack ? (
              <>
                {video && (
                  <SlideVideo
                    src={video.src}
                    poster={video.poster}
                    active={i === index && visible}
                    onBlockedChange={setVideoBlocked}
                    onNearEnd={() => {
                      const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
                      if (!paused && visible && !swiped && !reduced) go(i + 1);
                    }}
                  />
                )}
                <div className="carousel-stack">
                  {photos.map((photo) => (
                    <div key={photo.src} className="stack-cell">
                      {renderPhoto(photo)}
                    </div>
                  ))}
                </div>
              </>
            ) : (
              photos.map(renderPhoto)
            )}
          </div>
        );
      })}

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

export function Hero() {
  return (
    <header id="top" className="hero">
      <HeroCarousel />

      <div className="hero-inner">
        <h1>
          Your Pane is
          <em>Our Pleasure</em>
        </h1>
        <p className="hero-sub">
          Our goal is to provide quality, satisfying window cleaning to Greater
          Pensacola, FL residents. We believe showing up on time matters, and we
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
            <span className="rating-label">
              <span className="rating-label-lead">Read our </span>Google reviews
            </span>
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

        {/* Quote leads; call and plans are a matched pair under it. On a
            phone the call button is the one most people actually want. */}
        <div className="hero-actions">
          <QuoteButton />
          <div className="hero-twins">
            <a className="twin-button twin-button--call" href={PHONE_TEL}>
              <PhoneIcon />
              <span>{PHONE_DISPLAY}</span>
            </a>
            <a className="twin-button" href="#plans">
              <PlanIcon />
              <span>Service plans</span>
            </a>
          </div>
        </div>
      </div>

      {/* On-load squeegee wipe, disabled for now. The component (now in
          src/WindowWipe.tsx) and its styles are intact — render <WindowWipe />
          here to bring it back. */}
    </header>
  );
}
