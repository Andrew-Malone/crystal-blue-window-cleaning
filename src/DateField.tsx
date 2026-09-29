import {
  lazy,
  Suspense,
  useEffect,
  useId,
  useRef,
  useState,
  type ToggleEvent,
} from "react";
import { flushSync } from "react-dom";

const loadCalendar = () => import("./DateCalendar");
const DateCalendar = lazy(loadCalendar);

// Rough rendered size of the calendar popover, used to place it before it has
// been laid out (a hidden popover measures 0x0).
const CALENDAR_WIDTH = 340;
const CALENDAR_HEIGHT = 380;
const GAP = 6;

const pad = (n: number) => String(n).padStart(2, "0");

// The form stores dates as "YYYY-MM-DD", the same as <input type="date">.
function toValue(date: Date) {
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function toDate(value: string) {
  if (!value) return undefined;
  const [y, m, d] = value.split("-").map(Number);
  return new Date(y, m - 1, d);
}

function formatDate(date: Date, today: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: date.getFullYear() === today.getFullYear() ? undefined : "numeric",
  });
}

function CalendarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </svg>
  );
}

// Desktop browsers draw their own date picker, and some (Firefox) paint both
// weekend days red — which reads as "we're closed Saturdays". With a mouse we
// show our own calendar instead, where only Sunday is red. Touch devices keep
// the native picker, which is better on a phone and doesn't colour weekends.
export function DateField({
  label,
  name,
  value,
  onChange,
}: {
  label: string;
  name: string;
  value: string;
  onChange: (value: string) => void;
}) {
  const [today] = useState(() => {
    const now = new Date();
    return new Date(now.getFullYear(), now.getMonth(), now.getDate());
  });
  // Only ever rendered in the browser (the quote dialog mounts its form on
  // open), so reading matchMedia up front is safe.
  const [custom] = useState(
    () =>
      window.matchMedia("(hover: hover) and (pointer: fine)").matches &&
      "popover" in HTMLElement.prototype,
  );

  useEffect(() => {
    if (custom) void loadCalendar();
  }, [custom]);

  if (!custom) {
    return (
      <label>
        <span>{label}</span>
        <input
          name={name}
          type="date"
          min={toValue(today)}
          value={value}
          onChange={(event) => onChange(event.target.value)}
        />
      </label>
    );
  }

  return <CustomDateField label={label} value={value} onChange={onChange} today={today} />;
}

function CustomDateField({
  label,
  value,
  onChange,
  today,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  today: Date;
}) {
  const id = useId();
  const labelId = `${id}-label`;
  const valueId = `${id}-value`;
  const popoverId = `${id}-calendar`;
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  // Bumped on every open so the calendar remounts on the selected (or current)
  // month rather than wherever it was last left.
  const [session, setSession] = useState(0);
  const selected = toDate(value);

  // Popovers sit in the top layer, so the card's scroll box can't clip this
  // one — but it has to be pinned next to the button by hand. Below the field
  // when there's room, otherwise above it.
  const place = () => {
    const button = buttonRef.current;
    const popover = popoverRef.current;
    if (!button || !popover) return;

    const rect = button.getBoundingClientRect();
    const roomBelow = window.innerHeight - rect.bottom;
    const below = roomBelow >= CALENDAR_HEIGHT + GAP || rect.top < roomBelow;
    const left = Math.max(8, Math.min(rect.left, window.innerWidth - CALENDAR_WIDTH - 8));

    popover.style.left = `${left}px`;
    popover.style.top = below ? `${rect.bottom + GAP}px` : "auto";
    popover.style.bottom = below ? "auto" : `${window.innerHeight - rect.top + GAP}px`;
  };

  // The card can scroll on short screens; keep the calendar attached.
  useEffect(() => {
    if (!open) return;
    window.addEventListener("scroll", place, true);
    window.addEventListener("resize", place);
    return () => {
      window.removeEventListener("scroll", place, true);
      window.removeEventListener("resize", place);
    };
  }, [open]);

  const handleBeforeToggle = (event: ToggleEvent<HTMLDivElement>) => {
    if (event.newState !== "open") return;
    // Commit the fresh calendar and its position before the popover paints.
    flushSync(() => setSession((s) => s + 1));
    place();
  };

  const handleToggle = (event: ToggleEvent<HTMLDivElement>) => {
    const isOpen = event.newState === "open";
    setOpen(isOpen);
    if (!isOpen) return;

    const popover = popoverRef.current;
    const day =
      popover?.querySelector<HTMLButtonElement>(".rdp-selected .rdp-day_button") ??
      popover?.querySelector<HTMLButtonElement>(".rdp-today .rdp-day_button") ??
      popover?.querySelector<HTMLButtonElement>(".rdp-day_button:not(:disabled)");
    day?.focus();
  };

  const handleSelect = (date: Date | undefined) => {
    // Clicking the selected day again would clear it; keep the choice instead.
    if (date) onChange(toValue(date));
    popoverRef.current?.hidePopover();
    buttonRef.current?.focus();
  };

  return (
    <div className="date-field">
      <span id={labelId}>{label}</span>
      <button
        ref={buttonRef}
        type="button"
        className="date-field-button"
        popoverTarget={popoverId}
        aria-labelledby={`${labelId} ${valueId}`}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span id={valueId} className={selected ? undefined : "date-field-placeholder"}>
          {selected ? formatDate(selected, today) : "Choose a date"}
        </span>
        <CalendarIcon />
      </button>
      <div
        ref={popoverRef}
        id={popoverId}
        popover="auto"
        className="date-popover"
        role="dialog"
        aria-labelledby={labelId}
        onBeforeToggle={handleBeforeToggle}
        onToggle={handleToggle}
      >
        <Suspense fallback={null}>
          <DateCalendar key={session} selected={selected} today={today} onSelect={handleSelect} />
        </Suspense>
      </div>
    </div>
  );
}
