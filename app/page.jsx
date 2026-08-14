"use client";
import Hero from "./(landingpage)/Hero";
import Carousel from "./(landingpage)/Categories";
import Catalogue from "./(landingpage)/Catalogue";
import Catalogue2 from "./(landingpage)/Catalogue2";
import Stellar from "./(landingpage)/Stellar";
import Features from "./(landingpage)/Features";
import HowItWorks from "./(landingpage)/HowItWorks";
import Testimonials from "./(landingpage)/Testimonials";
import FAQ from "./(landingpage)/FAQ";
import Newsletter from "./(landingpage)/newsletter";
import AboutUs from "./(landingpage)/Aboutus";
import ContactUs from "./(landingpage)/ContactUs";
import Slider from "./(landingpage)/Slider";

export default function FirstPage() {
  return (
    <>
      {/* Hero & Product Showcase */}
      <Hero />
      <Carousel />
      <Catalogue />

      {/* Why ShoeSafari */}
      <Catalogue2 />

      {/* Stellar Payment Section */}
      <Stellar />
      <Features />
      <HowItWorks />

      {/* Product Showcase */}
      <Slider />

      {/* Social Proof */}
      <Testimonials />

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
