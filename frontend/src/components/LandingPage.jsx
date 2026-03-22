import React from "react";
import { Link, useNavigate } from "react-router-dom";

import "../styles/LandingPage.css";
import heroImg from "../assets/hero.jpg";
import missionImg from "../assets/mission.png";
import visionImg from "../assets/vision.png";
import shineLogo from "../assets/shineLogo.png";

const activities = [
  "We organize events, intiatives, and training sessions to help individuals and organizations make effect for society.",
  "We provide a space for communities to connect, share ideas, and speak freely.",
  "We allow people to post articles about what they are passionate about.",
  "We conduct research to provide insights and solutions for real-world challenges.",
];

const testimonials = [
  "Shine has transformed the way I approach events, providing invaluable skills and thinking.",
  "The collaborative environment at Shine has been instrumental in my professional growth.",
  "Thanks to Shine, I\'ve been able to think, analyze, understand policies",
  "Shine\'s commitment to innovation is truly inspiring and has helped me learn more.",
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <section className="hero-section" style={{ backgroundImage: `url(${heroImg})` }}>
        <div className="hero-overlay" />
        <div className="hero-content">
          <span className="hero-eyebrow">This is shine</span>
          <h1>A place for innovation, collaboration, and action.</h1>
          <p>
            Join a forward-thinking platform where ideas become initiatives and
            communities build meaningful change together.
          </p>
          <button
            type="button"
            className="hero-button"
            onClick={() => navigate("/forum")}
          >
            Explore
          </button>
        </div>
      </section>

      <div className="divider"></div>

      <section className="banner-hero">
        <h2>What is Shine?</h2>
        <p>
          Shine is a forward-thinking platform designed to foster innovation and
          collaboration among global communities. With a focus on empowerment
          and technology, Shine aims to bridge the gap between ideas and
          implementation, offering tools and resources to turn visions into
          reality.
        </p>
      </section>

      <div className="divider"></div>

      <section className="banner-do">
        <h2>What We Do</h2>
        <ul className="activities-list">
          {activities.map((activity) => (
            <li key={activity}>{activity}</li>
          ))}
        </ul>
      </section>

      <div className="divider"></div>

      <section className="banner-mv">
        <div className="group">
          <div className="text-group">
            <h3>Our Mission</h3>
            <p>
              To empower communities through innovation and collaboration,
              enabling them to make a positive impact on the world.
            </p>
          </div>
          <img src={missionImg} alt="Mission" />
        </div>

        <div className="group reverse">
          <div className="text-group">
            <h3>Our Vision</h3>
            <p>
              To become a global leader in fostering innovation and
              collaboration, driving positive change across industries and
              communities.
            </p>
          </div>
          <img src={visionImg} alt="Vision" />
        </div>
      </section>

      <div className="divider"></div>

      <section className="banner-members">
        <h2>Member Quotations</h2>
        <div className="quotes">
          {testimonials.map((quote) => (
            <blockquote key={quote} className="quote">
              {quote}
            </blockquote>
          ))}
        </div>
      </section>

      <footer>
        <div className="footer-top">
          <img src={shineLogo} alt="ShineLogo" style={{ width: 200 }} />
          <div className="footer-center">
            <p className="footer-text">For suggestions and Complaints</p>
            <Link to="/contact">
              <button type="button">Contact Us</button>
            </Link>
          </div>
        </div>
        <div className="footer-line"></div>
        <div className="footer-bottom">Shine © 2025, all rights reserved</div>
      </footer>
    </div>
  );
}
