import { revealIndex } from "../shared";
import dolphinBayUrl from "../assets/dolphin-bay-thailand.webp";

export function About() {
  return (
    <section id="about" className="section about" aria-label="About Dolphin Bay Window Cleaning">
      <div className="section-inner">
        <div className="about-intro">
          <div data-reveal>
            <h2 className="section-title">Who We Are</h2>
            <p className="about-lede">
              We're Ian and Oliver. We started Dolphin Bay because we were tired
              of contractors who show up late, or not at all, and call that good
              enough. You should know the people working on your home,
              and you should be able to count on them. When we say we'll be there,
              we're there. And our cleaning is excellent every time.
            </p>
          </div>

          <figure className="about-photo" data-reveal style={revealIndex(1)}>
            <img
              src={dolphinBayUrl}
              alt="A painted Thai fishing boat pulled up on the beach at Dolphin Bay at dusk"
              loading="lazy"
              decoding="async"
            />
            <figcaption>Dolphin Bay, Thailand: the bay we're named after.</figcaption>
          </figure>
        </div>

        <div className="about-grid">
          <div className="about-point" data-reveal style={revealIndex(0)}>
            <h3>Pure water technology</h3>
            <p>
              We clean with deionized water. With the minerals filtered out,
              there's nothing left behind to spot, so your glass dries clear.
            </p>
          </div>
          <div className="about-point" data-reveal style={revealIndex(1)}>
            <h3>Homes are our specialty</h3>
            <p>
              Single-story or two-story, exterior-only or inside and out: your
              house gets our full attention, not a slot between office jobs.
            </p>
          </div>
          <div className="about-point" data-reveal style={revealIndex(2)}>
            <h3>Licensed and insured</h3>
            <p>
              We're fully insured, so your home and property are covered
              while we work.
            </p>
          </div>
          <div className="about-point" data-reveal style={revealIndex(0)}>
            <h3>Second-story windows</h3>
            <p>
              Our water-fed pole reaches 40 feet, so we clean upper-floor
              windows from the ground, with no ladders against your house.
            </p>
          </div>
          <div className="about-point" data-reveal style={revealIndex(1)}>
            <h3>Screens, frames and sills</h3>
            <p>
              We clean your screens along with the glass and wipe down the
              frames and sills, so the whole window looks new, not just the pane.
            </p>
          </div>
          <div className="about-point" data-reveal style={revealIndex(2)}>
            <h3>Across the Pensacola area</h3>
            <p>
              We serve Pensacola, Gulf Breeze, Pace, Milton, Navarre and
              Perdido Key.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
