import { useEffect, type CSSProperties } from "react";

export const PHONE_TEL = "tel:+18503902894";
export const PHONE_DISPLAY = "(850) 390-2894";
export const EMAIL = "dolphinbaywindowcleaning@gmail.com";
export const QUOTE_PATH = "/quote";

// Opens the Maps listing on its reviews tab (the !9m1!1b1 part of the data).
export const GOOGLE_REVIEWS_URL =
  "https://www.google.com/maps/place/Gulf+Line+Window+Cleaning/@30.4851338,-87.2162395,11z/data=!4m8!3m7!1s0x826d2905b1efe7a1:0xdb37ca3cce2c7cd9!8m2!3d30.4849415!4d-87.0514285!9m1!1b1!16s%2Fg%2F11z8tnlj5r";
export const FACEBOOK_URL =
  "https://www.facebook.com/people/Dolphin-Bay-Window-Cleaning/61592673747370/";

// The three plans, in the order the cards show them: the quarterly plan in
// the middle, its neighbours either side. `visits` are the months (0-11,
// counted from whenever the plan starts) a visit falls in; the cards draw
// them as a filled cell in a twelve-cell year. `off` is dollars off every
// visit — the client's number for quarterly; the other two are placeholders
// until they confirm them.
export type PlanId = "triannual" | "quarterly" | "biannual";
export const PLANS: {
  id: PlanId;
  name: string;
  visits: number[];
  off: number;
  featured?: boolean;
}[] = [
  {
    id: "triannual",
    name: "Three times a year",
    visits: [0, 4, 8],
    off: 75,
  },
  {
    id: "quarterly",
    name: "Quarterly",
    visits: [0, 3, 6, 9],
    off: 100,
    featured: true,
  },
  {
    id: "biannual",
    name: "Twice a year",
    visits: [0, 6],
    off: 50,
  },
];

export function StarRow() {
  return (
    <span className="stars" aria-hidden="true">
      {[0, 1, 2, 3, 4].map((i) => (
        <svg key={i} viewBox="0 0 24 24">
          <path d="M12 2.6l2.9 5.88 6.5.95-4.7 4.58 1.11 6.47L12 17.43l-5.81 3.05 1.11-6.47-4.7-4.58 6.5-.95L12 2.6z" />
        </svg>
      ))}
    </span>
  );
}

export function FacebookIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M24 12.07C24 5.4 18.63 0 12 0S0 5.4 0 12.07C0 18.1 4.39 23.1 10.13 24v-8.44H7.08v-3.49h3.05V9.41c0-3.02 1.79-4.69 4.53-4.69 1.31 0 2.68.24 2.68.24v2.97h-1.51c-1.49 0-1.96.93-1.96 1.89v2.25h3.33l-.53 3.49h-2.8V24C19.61 23.1 24 18.1 24 12.07z" />
    </svg>
  );
}

export function PhoneIcon() {
  return (
    <svg className="contact-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M6.6 10.8a15.1 15.1 0 0 0 6.6 6.6l2.2-2.2c.3-.3.7-.4 1-.2 1.1.4 2.4.6 3.6.6.6 0 1 .4 1 1V20c0 .6-.4 1-1 1C10.6 21 3 13.4 3 4c0-.6.4-1 1-1h3.5c.6 0 1 .4 1 1 0 1.3.2 2.5.6 3.6.1.3 0 .7-.2 1l-2.3 2.2z"
      />
    </svg>
  );
}

export function MailIcon() {
  return (
    <svg className="contact-icon" viewBox="0 0 24 24" aria-hidden="true">
      <path
        fill="currentColor"
        d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4.2-8 4.8-8-4.8V6l8 4.8L20 6v2.2z"
      />
    </svg>
  );
}

export function ArrowIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12h13M13 6l6 6-6 6" />
    </svg>
  );
}

export function CheckIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M5 12.5l4.5 4.5L19 7" />
    </svg>
  );
}

// The big CTA. It's a link to the quote page, so it works before any
// JavaScript loads and can be opened in a new tab.
export function QuoteButton({ plan }: { plan?: PlanId }) {
  return (
    <a className="quote-button" href={plan ? `${QUOTE_PATH}?plan=${plan}` : QUOTE_PATH}>
      <span>Get a quote</span>
      <span className="quote-button-icon" aria-hidden="true">
        <ArrowIcon />
      </span>
    </a>
  );
}

// Staggers siblings in a grid; read by the [data-reveal] transition-delay.
export function revealIndex(i: number) {
  return { "--reveal-i": i } as CSSProperties;
}

// Fades each [data-reveal] element in the first time it scrolls into view.
export function useReveal() {
  useEffect(() => {
    const targets = document.querySelectorAll("[data-reveal]");
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          entry.target.classList.add("is-revealed");
          observer.unobserve(entry.target);
        }
      },
      { rootMargin: "0px 0px -10% 0px" },
    );
    targets.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);
}
