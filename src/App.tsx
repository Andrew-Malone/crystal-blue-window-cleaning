import { useReveal, EMAIL, MailIcon, PHONE_DISPLAY, PHONE_TEL, PhoneIcon, QUOTE_PATH, QuoteButton } from "./shared";
import { HomePage } from "./home/HomePage";
import { QuotePage } from "./quote/QuotePage";
import logoMarkUrl from "./assets/logo-mark.png";

// Section links are written as "/#id" so they work from the quote page too;
// on the home page the browser treats them as a plain in-page jump.
function SiteNav({ page }: { page: "home" | "quote" }) {
  return (
    <nav className="site-nav" aria-label="Main">
      <a className="brand" href="/">
        <span className="brand-mark" aria-hidden="true">
          <img src={logoMarkUrl} alt="" width={240} height={141} />
        </span>
        <span className="brand-name">
          <b>Dolphin Bay</b>
          <span>Window Cleaning</span>
        </span>
      </a>

      <div className="nav-links">
        <a href="/#plans">Plans</a>
        <a href="/#reviews">Reviews</a>
        <a href="/#about">Who We Are</a>
        <a href="/#faq">FAQ</a>
        <a href="/#contact">Contact</a>
      </div>

      {page === "quote" ? (
        <a className="nav-quote nav-quote--call" href={PHONE_TEL} aria-label={`Call ${PHONE_DISPLAY}`}>
          <PhoneIcon />
          <span className="nav-call-number">{PHONE_DISPLAY}</span>
          <span className="nav-call-word">Call</span>
        </a>
      ) : (
        <a className="nav-quote" href={QUOTE_PATH}>
          Get a quote
        </a>
      )}
    </nav>
  );
}

function Contact({ page }: { page: "home" | "quote" }) {
  return (
    <section id="contact" className="contact" aria-label="Contact Dolphin Bay Window Cleaning">
      <div className="contact-inner">
        <div className="contact-main">
          <div className="contact-details">
            <a className="contact-phone" href={PHONE_TEL}>
              <PhoneIcon />
              {PHONE_DISPLAY}
            </a>
            <a className="contact-email" href={`mailto:${EMAIL}`}>
              <MailIcon />
              {EMAIL}
            </a>
          </div>

          {/* The quote page is the form; it doesn't need a button back to itself. */}
          {page === "home" ? <QuoteButton /> : null}
        </div>

        <footer className="site-footer">
          {/* The year is baked in at build time; the browser may disagree
              after New Year until the next deploy. */}
          <p suppressHydrationWarning>
            © {new Date().getFullYear()} Dolphin Bay Window Cleaning
          </p>
          <p>Serving Pensacola, Gulf Breeze, Pace, Milton, Navarre and Perdido Key</p>
          {page === "home" ? (
            /* The Dolphin Bay photo is CC BY-SA 2.0, which requires this
               credit. The hero background is CC0 and needs none. */
            <p className="footer-credit">
              Dolphin Bay photo:{" "}
              <a
                href="https://commons.wikimedia.org/wiki/File:Dolphin_Bay_Thailand_(12211183056).jpg"
                target="_blank"
                rel="noopener noreferrer"
              >
                Clay Gilliland
              </a>
              ,{" "}
              <a
                href="https://creativecommons.org/licenses/by-sa/2.0/"
                target="_blank"
                rel="noopener noreferrer"
              >
                CC BY-SA 2.0
              </a>
            </p>
          ) : null}
        </footer>
      </div>
    </section>
  );
}

// `path` is the URL path: "/" (or anything unknown) is the home page and
// "/quote" the quote page. Cloudflare serves dist/quote.html at /quote; the
// dev server also answers /quote.html.
export default function App({ path }: { path: string }) {
  const page = /^\/quote(\.html)?\/?$/.test(path) ? "quote" : "home";
  useReveal();

  return (
    <>
      <SiteNav page={page} />
      {page === "quote" ? <QuotePage /> : <HomePage />}
      <Contact page={page} />
    </>
  );
}
