import React, { useState } from 'react';
import './Navbar.css';

const Navbar = ({ onAuthClick }) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen);
  };

  return (
    <nav className="navbar">
      <div className="container">
        <div className="nav-content">
          <div className="nav-logo">
            <h2>TeamSync</h2>
          </div>
          
          <div className={`nav-menu ${isMenuOpen ? 'active' : ''}`}>
            <a href="#home" className="nav-link">Home</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#contact" className="nav-link">Contact</a>
          </div>
          
          <div className="nav-auth">
            <button 
              className="btn btn-secondary nav-btn"
              onClick={() => onAuthClick('signin')}
            >
              Sign In
            </button>
            <button 
              className="btn btn-primary nav-btn"
              onClick={() => onAuthClick('signup')}
            >
              Sign Up
            </button>
          </div>
          
          <div className="hamburger" onClick={toggleMenu}>
            <span></span>
            <span></span>
            <span></span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;