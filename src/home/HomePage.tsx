import { Hero } from "./Hero";
import { Plans } from "./Plans";
import { Reviews } from "./Reviews";
import { About } from "./About";
import { Faq } from "./Faq";

export function HomePage() {
  return (
    <>
      <Hero />
      <main>
        <Plans />
        <Reviews />
        <About />
        <Faq />
      </main>
    </>
  );
}
