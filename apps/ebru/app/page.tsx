"use client";

import { useEffect } from "react";
import Hero from "@/components/Hero";
import MintSection from "@/components/MintSection";
import Gallery from "@/components/Gallery";
import AboutEbru from "@/components/AboutEbru";
import Footer from "@/components/Footer";

export default function Home() {
  /* Global scroll reveal for .reveal elements */
  useEffect(() => {
    const els = document.querySelectorAll(".reveal");
    const obs = new IntersectionObserver(
      (entries) =>
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add("visible");
            obs.unobserve(e.target);
          }
        }),
      { threshold: 0.08, rootMargin: "0px 0px -40px 0px" }
    );
    els.forEach((el) => obs.observe(el));
    return () => obs.disconnect();
  }, []);

  return (
    <>
      <Hero />
      <MintSection />
      <Gallery />
      <AboutEbru />
      <Footer />
    </>
  );
}
