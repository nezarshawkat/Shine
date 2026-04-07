import React from "react";
import { Link, useNavigate } from "react-router-dom";

import "../styles/LandingPage.css";
import heroImg from "../assets/hero.jpg";
import missionImg from "../assets/mission.png";
import visionImg from "../assets/vision.png";
import shineLogo from "../assets/shineLogo.png";

const whatWeDoText =
  "Shine is a platform built for thoughtful discussion, debate, and analysis of important public and global topics. Members can share ideas, publish opinions, explore major events around the world, and engage in meaningful conversations about history, society, and international affairs.";

const testimonials = [
  '"I love how easy it is to discover news and insights from around the world."',
  '"The articles section is my favorite—I always learn something new there."',
  '"I really appreciate the respectful discussions; it’s rare to find that online."',
];

export default function LandingPage() {
  const navigate = useNavigate();

  return (
    <div className="landing-page">
      <section className="hero-section" style={{ backgroundImage: `url(${heroImg})` }}>
        <div className="hero-overlay" />
        <div className="hero-content">
          <span className="hero-eyebrow">This is Shine</span>
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
        <p className="banner-text">
          Shine is a digital platform designed for anyone interested in
          history, world affairs, and global events. It brings together people from
          around the world to share ideas, discuss current issues, and explore
          diverse perspectives. Whether you want to read insightful articles,
          participate in debates, join communities, or attend events, SHINE
          provides a space where thoughtful conversation and learning come
          first.
        </p>
      </section>

      <div className="divider"></div>

      <section className="banner-do">
        <h2>What We Do</h2>
        <p className="banner-text">{whatWeDoText}</p>
      </section>

      <div className="divider"></div>

      <section className="banner-mv">
        <div className="group">
          <div className="text-group">
            <h3>Mission</h3>
            <p className="banner-text">
              Our mission is to create a space where open discussion and
              diverse perspectives help people better understand society,
              global affairs, and the forces shaping the world around them.
            </p>
          </div>
          <img src={missionImg} alt="Mission" />
        </div>

        <div className="group reverse">
          <div className="text-group">
            <h3>Vision</h3>
            <p className="banner-text">
              We envision a global community where thoughtful debate, shared
              knowledge, and respectful dialogue help people develop a deeper
              understanding of important issues and world developments.
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

        {/* Divider with top margin to prevent touching logo */}
        <div className="footer-line first-divider"></div>

        <div className="footer-links">
          <Link to="/privacypolicy">Privacy Policy</Link>
          <span className="footer-separator">|</span>
          <Link to="/terms&conditions">Terms & Conditions</Link>
        </div>

        <div className="footer-line"></div>
        
        <div className="footer-bottom">Shine © 2026, all rights reserved</div>
      </footer>
    </div>
  );
}
