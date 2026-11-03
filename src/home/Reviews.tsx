import { GOOGLE_REVIEWS_URL, StarRow, revealIndex } from "../shared";

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

export function Reviews() {
  return (
    <section id="reviews" className="section reviews" aria-label="Customer reviews">
      <div className="section-inner">
        <h2 className="section-title" data-reveal>What our clients say about us</h2>
        <div className="reviews-grid">
          {REVIEWS.map(({ name, text }, i) => (
            <figure key={name} className="review-card" data-reveal style={revealIndex(i)}>
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
        <div className="reviews-links" data-reveal>
          <a href={GOOGLE_REVIEWS_URL} target="_blank" rel="noopener noreferrer">
            Read all our reviews on Google →
          </a>
        </div>
      </div>
    </section>
  );
}
