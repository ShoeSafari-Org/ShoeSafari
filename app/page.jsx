"use client";
import Hero from "./(landingpage)/Hero";
import Carousel from "./(landingpage)/Categories";
import Catalogue2 from "./(landingpage)/Catalogue2";
import Stellar from "./(landingpage)/Stellar";
import Features from "./(landingpage)/Features";
import HowItWorks from "./(landingpage)/HowItWorks";
import FAQ from "./(landingpage)/FAQ";
import Newsletter from "./(landingpage)/newsletter";
import AboutUs from "./(landingpage)/Aboutus";
import ContactUs from "./(landingpage)/ContactUs";

export default function FirstPage() {
  return (
    <>
      {/* Hero & Product Showcase */}
      <Hero />
      <Carousel />
      {/* Why ShoeSafari */}
      <Catalogue2 />

      {/* Stellar Payment Section */}
      <Stellar />
      <Features />
      <HowItWorks />

      {/* FAQ */}
      <FAQ />

      {/* Mission & OSS */}
      <AboutUs />

      {/* Newsletter & Contact */}
      <Newsletter />
      <ContactUs />
    </>
  );
}
