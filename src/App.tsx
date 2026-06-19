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

function QuoteForm() {
  const [step, setStep] = useState(1);
  const [stepHeight, setStepHeight] = useState<number>();
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

  const qualificationComplete =
    form.stories !== "" &&
    form.serviceType !== "";

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
        <span>Step {step} of 2</span>
      </div>

      <div className="step-frame" style={{ height: stepHeight }}>
        <div className="step-content" ref={stepContentRef} key={step}>
          {step === 1 ? (
            <>
              <div className="field-grid">
                <label>
                  <span>Approximate window count</span>
                  <input
                    name="windowCount"
                  type="number"
                  inputMode="numeric"
                  min="1"
                  placeholder="20"
                  value={form.windowCount}
                  onChange={(event) => updateField("windowCount", event.target.value)}
                />
                </label>
                <label>
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
              <div className="service-field">
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
              <p className="range-note">{estimateRange}</p>
              <button
                type="button"
                disabled={!qualificationComplete}
                onClick={() => setStep(2)}
              >
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

      <div className="window-scene" aria-hidden="true">
        <div className="glass-haze" />
        <div className="dirty-glass" />
        <div className="clean-swipe" />
      </div>

      <div id="quote" className="quote-shell">
        <QuoteForm />
      </div>
    </header>
  );
}

export default function App() {
  return <Hero />;
}
