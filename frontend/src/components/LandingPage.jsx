import React from "react";

import Header from "./Header";
import "../styles/LandingPage.css"; // Make sure to import the CSS we created

// Example images (replace with your actual assets)
import missionImg from "../assets/mission.png";
import visionImg from "../assets/vision.png";
import service1 from "../assets/service1.png";
import service2 from "../assets/service2.png";
import service3 from "../assets/service3.png";
import service4 from "../assets/service4.png";
import shineLogo from "../assets/shineLogo.png";

export default function LandingPage() {
  return (
    <div className="landing-page">
      <Header />

      {/* Hero section */}
      <section className="h-screen flex flex-col justify-center items-center bg-gradient-to-r from-blue-500 to-indigo-600 text-white">
        <h1 className="text-5xl font-bold mb-4">A place for discussion</h1>
        <p className="text-lg mb-6 max-w-xl text-center">
          Empowering people through discussion, innovation, and action.
        </p>
        <button className="bg-white text-blue-600 font-semibold px-6 py-3 rounded hover:bg-blue-100">
          Be a member
        </button>
      </section>

      {/* Divider */}
      <div className="divider"></div>

      {/* Banner 1: What is Shine? */}
      <section className="banner-hero">
        <h2>What is Shine?</h2>
        <p>
          Lorem ipsum dolor sit amet, consectetur adipiscing elit. Fusce
          tristique justo a nulla consectetur, non aliquam urna facilisis.
        </p>
      </section>

      {/* Divider */}
      <div className="divider"></div>

      {/* Banner 2: What do we do? */}
      <section className="banner-do">
        <h2>What do we do?</h2>
        <div className="services">
          <div className="service">
            <img src={service1} alt="Service 1" />
            <p>Lorem ipsum dolor sit amet</p>
          </div>
          <div className="service">
            <img src={service2} alt="Service 2" />
            <p>Lorem ipsum dolor sit amet</p>
          </div>
          <div className="service">
            <img src={service3} alt="Service 3" />
            <p>Lorem ipsum dolor sit amet</p>
          </div>
          <div className="service">
            <img src={service4} alt="Service 4" />
            <p>Lorem ipsum dolor sit amet</p>
          </div>
        </div>
      </section>

      {/* Divider */}
      <div className="divider"></div>

      {/* Banner 3: Mission & Vision */}
      <section className="banner-mv">
        <div className="group">
          <div className="text-group">
            <h3>Our Mission</h3>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus
              lacinia odio vitae vestibulum vestibulum.
            </p>
          </div>
          <img src={missionImg} alt="Mission" />
        </div>

        <div className="group reverse">
          <div className="text-group">
            <h3>Our Vision</h3>
            <p>
              Lorem ipsum dolor sit amet, consectetur adipiscing elit. Vivamus
              lacinia odio vitae vestibulum vestibulum.
            </p>
          </div>
          <img src={visionImg} alt="Vision" />
        </div>
      </section>

      {/* Divider */}
      <div className="divider"></div>

      {/* Banner 4: From our Members */}
      <section className="banner-members">
        <h2>From our Members</h2>
        <div className="quotes">
          <div className="quote">
            "Lorem ipsum dolor sit amet, consectetur adipiscing elit."
          </div>
          <div className="quote">
            "Vivamus lacinia odio vitae vestibulum vestibulum."
          </div>
          <div className="quote">
            "Cras ultricies ligula sed magna dictum porta."
          </div>
          <div className="quote">
            "Pellentesque in ipsum id orci porta dapibus."
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer>
        <div className="footer-top">
          <img src={shineLogo} alt="ShineLogo" style={{ width: 200 }} />
          <div>
            <p className="footer-text">For suggestions and Complaints</p>
            <button>Contact Us</button>
          </div>
        </div>
        <div className="footer-line"></div>
        <div className="footer-bottom">Shine © 2025, all rights reserved</div>
      </footer>
    </div>
  );
}
