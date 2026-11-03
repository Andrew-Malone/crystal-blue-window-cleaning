import type { ReactNode } from "react";
import { PHONE_DISPLAY, PHONE_TEL, revealIndex } from "../shared";

// Plain facts, in the owners' voice. Anything about rain policy or a
// satisfaction guarantee is left out on purpose until the client confirms it.
const FAQS: { q: string; a: ReactNode }[] = [
  {
    q: "What areas do you serve?",
    a: (
      <>
        Pensacola, Gulf Breeze, Pace, Milton, Navarre and Perdido Key. If you're
        not sure whether you're in range,{" "}
        <a href={PHONE_TEL}>give us a call</a> and we'll let you know.
      </>
    ),
  },
  {
    q: "How do you price a job?",
    a: "We come by, look at the windows and give you a number on the spot. It depends on how many windows you have, how many stories, and whether you want the inside done too. The quote is free and there's no pressure to book.",
  },
  {
    q: "How do you clean the windows?",
    a: "Outside, we use purified, deionized water fed through a soft brush on a pole. Because the water has had its minerals removed, it dries without spots, so there's no squeegee, no soap and no residue. Inside, we work by hand with a squeegee and microfiber.",
  },
  {
    q: "Can you reach second-story windows?",
    a: "Yes. Our water-fed pole reaches 40 feet, which covers second-story windows with room to spare, and we never lean a ladder against your house.",
  },
  {
    q: "Do I need to be home?",
    a: "Not for exterior cleaning. As long as we can get to the windows, we can do the job while you're out and send you a text when we're done. If you'd like the inside cleaned too, someone will need to let us in.",
  },
  {
    q: "Do you clean screens, frames and sills?",
    a: "Yes. Screens come off, get cleaned and go back on, and we wipe down the frames and sills with every visit. Ask about window tracks when we quote; those take a little extra time.",
  },
  {
    q: "Which service plan should I pick?",
    a: "Quarterly if you want windows that never look dirty, especially near the water where salt haze builds up fast. Three times a year covers spring, post-pollen and the holidays. Twice a year, spring and fall, is the minimum we'd suggest for the Gulf Coast. The more often we come, the more we take off each visit.",
  },
  {
    q: "Is your cleaning safe for my plants and pets?",
    a: "Yes. We clean with purified, deionized water, so there's nothing in the runoff that will hurt your yard or your animals.",
  },
  {
    q: "What payment methods do you accept?",
    a: "Card, Venmo, Zelle, cash or check, whichever is easiest for you. We'll settle up once you've had a look at the windows.",
  },
  {
    q: "Are you insured?",
    a: "Yes. We're fully licensed and insured, so your home and property are covered the whole time we're working on them.",
  },
  {
    q: "How often should I have my windows cleaned?",
    a: "For most homes around here, every six months at least. If you're close to the bay or the Gulf, salt in the air will haze the glass faster, which is why our quarterly plan is the one most people pick.",
  },
];

export function Faq() {
  return (
    <section id="faq" className="section faq" aria-label="Frequently asked questions">
      <div className="section-inner">
        <h2 className="section-title" data-reveal>Frequently asked questions</h2>

        {/* Two independent columns, so opening an answer on one side doesn't
            push the other side's rows out of line. */}
        <div className="faq-columns">
          {[FAQS.slice(0, Math.ceil(FAQS.length / 2)), FAQS.slice(Math.ceil(FAQS.length / 2))].map(
            (column, c) => (
              <div key={c} className="faq-list">
                {column.map(({ q, a }) => (
                  <details key={q} className="faq-item" data-reveal style={revealIndex(c)}>
                    <summary>
                      {q}
                      <span className="faq-toggle" aria-hidden="true" />
                    </summary>
                    <p>{a}</p>
                  </details>
                ))}
              </div>
            ),
          )}
        </div>

        <p className="faq-more" data-reveal>
          Something else on your mind? Call or text{" "}
          <a href={PHONE_TEL}>{PHONE_DISPLAY}</a> and ask.
        </p>
      </div>
    </section>
  );
}
