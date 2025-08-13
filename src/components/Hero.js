import React from 'react';
import './Hero.css';

const Hero = ({ onGetStarted }) => {
  return (
    <section id="home" className="hero">
      <div className="container">
        <div className="hero-content fade-in-up">
          <h1 className="hero-title">
            Streamline Your Team's
            <span className="gradient-text"> Productivity</span>
          </h1>
          <p className="hero-description">
            Empower managers to assign tasks, track daily work, and analyze team performance 
            with our comprehensive team management system. Built for modern teams who value 
            transparency and accountability.
          </p>
          <div className="hero-buttons">
            <button className="btn btn-primary hero-btn" onClick={onGetStarted}>
              Get Started Free
            </button>
            <button className="btn btn-secondary hero-btn">
              Watch Demo
            </button>
          </div>
          <div className="hero-stats">
            <div className="stat">
              <h3>500+</h3>
              <p>Teams Using</p>
            </div>
            <div className="stat">
              <h3>99.9%</h3>
              <p>Uptime</p>
            </div>
            <div className="stat">
              <h3>24/7</h3>
              <p>Support</p>
            </div>
          </div>
        </div>
        <div className="hero-image fade-in-up">
          <div className="hero-card">
            <div className="card-header">
              <div className="card-dots">
                <span></span>
                <span></span>
                <span></span>
              </div>
              <h4>Team Dashboard</h4>
            </div>
            <div className="card-content">
              <div className="task-item">
                <div className="task-status completed"></div>
                <span>Website Redesign</span>
                <span className="task-date">Due Today</span>
              </div>
              <div className="task-item">
                <div className="task-status in-progress"></div>
                <span>API Development</span>
                <span className="task-date">Due Tomorrow</span>
              </div>
              <div className="task-item">
                <div className="task-status pending"></div>
                <span>Testing Phase</span>
                <span className="task-date">Due Friday</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;