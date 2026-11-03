import { CheckIcon, PLANS, QUOTE_PATH, revealIndex } from "../shared";

// What every plan visit includes. Keep these to things the rest of the site
// already promises.
const INCLUDED = [
  "Frames and sills wiped down",
  "Screens cleaned",
  "Spot-free deionized water",
];

// Twelve cells, one per month from whenever the plan starts; the visit
// months are filled. It's the only place the frequency is spelled out, so
// the label says it for screen readers.
function YearStrip({ visits }: { visits: number[] }) {
  return (
    <span
      className="year-strip"
      role="img"
      aria-label={`${visits.length} visits a year`}
    >
      {Array.from({ length: 12 }, (_, m) => (
        <span key={m} className={visits.includes(m) ? "is-visit" : undefined} />
      ))}
    </span>
  );
}

export function Plans() {
  return (
    <section id="plans" className="section plans" aria-label="Service plans">
      <div className="section-inner">
        <div className="plans-intro" data-reveal>
          <h2 className="section-title">Service plans</h2>
          <p className="plans-lede">
            Pick how often you'd like us to come by, and we take a set amount off
            every visit. The price itself is set at your home, the same as a
            one-time clean, so choose a rhythm now and we'll confirm the number
            when we see your windows.
          </p>
        </div>

        <div className="plans-grid">
          {PLANS.map((plan, i) => (
            <article
              key={plan.id}
              className={`plan-card${plan.featured ? " plan-card--featured" : ""}`}
              data-reveal
              style={revealIndex(plan.featured ? 0 : 1)}
              aria-labelledby={`plan-${plan.id}`}
            >
              {plan.featured ? <span className="plan-badge">Best value</span> : null}
              <h3 id={`plan-${plan.id}`}>{plan.name}</h3>
              <YearStrip visits={plan.visits} />
              <p className="plan-price">
                <b>${plan.off}</b>
                <span>off every visit</span>
              </p>
              <ul className="plan-includes">
                {INCLUDED.map((item) => (
                  <li key={item}>
                    <CheckIcon />
                    {item}
                  </li>
                ))}
              </ul>
              <a className="plan-cta" href={`${QUOTE_PATH}?plan=${plan.id}`}>
                Choose {plan.name.toLowerCase()}
              </a>
              <span className="sr-only">{i + 1} of {PLANS.length}</span>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
