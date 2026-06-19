import type { CSSProperties } from "react";
import vistaUrl from "./assets/gulf-coast-vista.png";

function QuoteForm() {
  return (
    <form className="quote-card" aria-label="Request a window cleaning quote">
      <h2>Request a quote</h2>
      <div className="field-grid">
        <label>
          <span>First name</span>
          <input name="firstName" type="text" autoComplete="given-name" />
        </label>
        <label>
          <span>Last name</span>
          <input name="lastName" type="text" autoComplete="family-name" />
        </label>
      </div>
      <div className="field-grid">
        <label>
          <span>Phone</span>
          <input name="phone" type="tel" autoComplete="tel" />
        </label>
        <label>
          <span>Email</span>
          <input name="email" type="email" autoComplete="email" />
        </label>
      </div>
      <label>
        <span>Street address</span>
        <input name="streetAddress" type="text" autoComplete="street-address" />
      </label>
      <label>
        <span>When do you want the work done by?</span>
        <input name="desiredDate" type="date" />
      </label>
      <label>
        <span>Anything else we should know?</span>
        <textarea
          name="details"
          rows={4}
          placeholder="Gate codes, service details, problem windows, preferred timing..."
        />
      </label>
      <button type="submit">Request a Quote</button>
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
          <span className="brand-mark" aria-hidden="true">CB</span>
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
