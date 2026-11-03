import { useEffect, useState, type FormEvent } from "react";
import { DateField } from "../DateField";
import { PHONE_DISPLAY, PHONE_TEL, PLANS, PhoneIcon, type PlanId } from "../shared";

const SERVICES = [
  { id: "exterior", label: "Exterior windows" },
  { id: "interior", label: "Interior windows" },
  { id: "screens", label: "Screens" },
  { id: "tracks", label: "Window tracks" },
] as const;

const STORIES = [
  { id: "one", label: "One story" },
  { id: "two", label: "Two stories" },
] as const;

type PlanChoice = PlanId | "once";

// A row of tap-to-select options; several can stay pressed.
function ChipGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: readonly { id: T; label: string }[];
  value: T[];
  onChange: (next: T[]) => void;
}) {
  return (
    <fieldset className="chip-field">
      <legend>{label}</legend>
      <div className="chip-row">
        {options.map((option) => {
          const selected = value.includes(option.id);
          return (
            <button
              key={option.id}
              type="button"
              className={`chip${selected ? " is-selected" : ""}`}
              aria-pressed={selected}
              onClick={() =>
                onChange(
                  selected ? value.filter((v) => v !== option.id) : [...value, option.id],
                )
              }
            >
              {option.label}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

// Quarterly is the plan the owners want people on, so it's a checkbox that
// starts checked, with the saving as the headline. The other plans sit under
// it as pills, money first; picking one unchecks the box.
function PlanPicker({ value, onChange }: { value: PlanChoice; onChange: (p: PlanChoice) => void }) {
  const quarterly = PLANS.find((p) => p.id === "quarterly")!;
  const checked = value === "quarterly";
  const others: { id: PlanChoice; label: string; off?: number }[] = [
    ...PLANS.filter((p) => p.id !== "quarterly").map((p) => ({
      id: p.id,
      label: p.name,
      off: p.off,
    })),
    { id: "once", label: "Just once" },
  ];
  return (
    <fieldset className="chip-field plan-field">
      <legend>Service plan</legend>
      <label className={`plan-check${checked ? " is-checked" : ""}`}>
        <input
          type="checkbox"
          name="quarterlyPlan"
          checked={checked}
          onChange={(e) => onChange(e.target.checked ? "quarterly" : "once")}
        />
        <span className="plan-check-box" aria-hidden="true">
          <svg viewBox="0 0 24 24">
            <path d="M5 12.5l4.5 4.5L19 7" />
          </svg>
        </span>
        <span className="plan-check-text">
          <b className="plan-money">−${quarterly.off} every visit</b>
          <span>Quarterly plan</span>
        </span>
      </label>
      <div className="chip-row chip-row--plans" role="radiogroup" aria-label="Other service plans">
        {others.map((option) => {
          const selected = value === option.id;
          return (
            <button
              key={option.id}
              type="button"
              role="radio"
              className={`chip chip--plan${selected ? " is-selected" : ""}`}
              aria-checked={selected}
              onClick={() => onChange(option.id)}
            >
              {option.off ? <b className="plan-money">−${option.off}</b> : null}
              <span>{option.label}</span>
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}

export function QuotePage() {
  const [submitState, setSubmitState] = useState<"idle" | "sending" | "sent" | "error">("idle");
  const [form, setForm] = useState({
    services: [] as string[],
    stories: [] as string[],
    plan: "quarterly" as PlanChoice,
    firstName: "",
    lastName: "",
    phone: "",
    email: "",
    streetAddress: "",
    city: "",
    desiredDate: "",
    details: "",
  });

  const update = <K extends keyof typeof form>(name: K, value: (typeof form)[K]) =>
    setForm((current) => ({ ...current, [name]: value }));

  // A plan card links here with ?plan=biannual etc. (quarterly is already the
  // default). Read it after mount so the prerendered markup, which has no
  // query string, hydrates cleanly.
  useEffect(() => {
    const plan = new URLSearchParams(window.location.search).get("plan");
    if (plan && PLANS.some((p) => p.id === plan)) {
      setForm((current) => ({ ...current, plan: plan as PlanId }));
    }
  }, []);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();

    const endpoint = import.meta.env.VITE_FORMSPREE_ENDPOINT as string | undefined;
    if (!endpoint) {
      console.error("VITE_FORMSPREE_ENDPOINT is not configured");
      setSubmitState("error");
      return;
    }

    setSubmitState("sending");

    // Arrays go through as readable text in the email Formspree sends.
    const planName = PLANS.find((p) => p.id === form.plan)?.name ?? "Just once for now";
    const body = {
      ...form,
      services: form.services.map((id) => SERVICES.find((s) => s.id === id)?.label ?? id).join(", "),
      stories: form.stories.join(", "),
      plan: planName,
    };

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: { Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      setSubmitState(response.ok ? "sent" : "error");
    } catch {
      setSubmitState("error");
    }
  };

  return (
    <main className="quote-page">
      <div className="quote-layout">
        <div className="quote-intro" data-reveal>
          <h1>Get a free quote</h1>
          <p className="quote-lede">
            Tell us a little about your home. We'll call or text to set up a
            time to come by, and you'll have a price before we leave.
          </p>
          {/* A real sequence, so the numbers earn their place. */}
          <ol className="quote-steps">
            <li>Send this form</li>
            <li>We call to set a time</li>
            <li>We look and quote on the spot</li>
          </ol>
          <a className="quote-call-button" href={PHONE_TEL}>
            <PhoneIcon />
            <span>Or call {PHONE_DISPLAY}</span>
          </a>
        </div>

        {submitState === "sent" ? (
          <div className="quote-form quote-form--sent" role="status">
            <h2>Thanks, {form.firstName.trim() || "neighbor"}. We got it.</h2>
            <p>
              We'll call or text {form.phone} to set up a time to come by. If
              you'd rather not wait, call us at{" "}
              <a href={PHONE_TEL}>{PHONE_DISPLAY}</a>.
            </p>
            <a className="quote-form-home" href="/">
              Back to the home page
            </a>
          </div>
        ) : (
          <form
            className="quote-form"
            aria-label="Request a window cleaning quote"
            onSubmit={handleSubmit}
            data-reveal
          >
            <ChipGroup
              label="What should we clean?"
              options={SERVICES}
              value={form.services}
              onChange={(v) => update("services", v)}
            />

            <ChipGroup
              label="How many stories?"
              options={STORIES}
              value={form.stories}
              onChange={(v) => update("stories", v.slice(-1))}
            />

            <PlanPicker value={form.plan} onChange={(p) => update("plan", p)} />

            <div className="field-grid">
              <label>
                <span>First name</span>
                <input
                  name="firstName"
                  type="text"
                  autoComplete="given-name"
                  required
                  value={form.firstName}
                  onChange={(e) => update("firstName", e.target.value)}
                />
              </label>
              <label>
                <span>Last name</span>
                <input
                  name="lastName"
                  type="text"
                  autoComplete="family-name"
                  required
                  value={form.lastName}
                  onChange={(e) => update("lastName", e.target.value)}
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
                  required
                  value={form.phone}
                  onChange={(e) => update("phone", e.target.value)}
                />
              </label>
              <label>
                <span>Email (optional)</span>
                <input
                  name="email"
                  type="email"
                  autoComplete="email"
                  value={form.email}
                  onChange={(e) => update("email", e.target.value)}
                />
              </label>
            </div>

            <div className="field-grid field-grid--address">
              <label>
                <span>Street address</span>
                <input
                  name="streetAddress"
                  type="text"
                  autoComplete="street-address"
                  required
                  value={form.streetAddress}
                  onChange={(e) => update("streetAddress", e.target.value)}
                />
              </label>
              <label>
                <span>City</span>
                <input
                  name="city"
                  type="text"
                  autoComplete="address-level2"
                  placeholder="Pensacola"
                  value={form.city}
                  onChange={(e) => update("city", e.target.value)}
                />
              </label>
            </div>

            <DateField
              label="When do you want the work done by?"
              name="desiredDate"
              value={form.desiredDate}
              onChange={(value) => update("desiredDate", value)}
            />

            <label>
              <span>Anything else we should know? (optional)</span>
              <textarea
                name="details"
                rows={3}
                placeholder="Gate code, pets, hard-to-reach windows, anything you'd like us to look at…"
                value={form.details}
                onChange={(e) => update("details", e.target.value)}
              />
            </label>

            <div className="quote-submit">
              <button type="submit" disabled={submitState === "sending"}>
                {submitState === "sending" ? "Sending…" : "Request my quote"}
              </button>
              {submitState === "error" ? (
                <p className="form-status form-status--error">
                  Something went wrong sending your request. Please call or text{" "}
                  <a href={PHONE_TEL}>{PHONE_DISPLAY}</a> instead.
                </p>
              ) : null}
            </div>
          </form>
        )}
      </div>
    </main>
  );
}
