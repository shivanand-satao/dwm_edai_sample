import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import './App.css';

// Landing Page Components
import Navbar from './components/Navbar';
import Hero from './components/Hero';
import Features from './components/Features';
import Contact from './components/Contact';
import Footer from './components/Footer';
import AuthModal from './components/AuthModal';

// Dashboard Components
import ManagerDashboard from './components/ManagerDashboard';
import EmployeeDashboard from './components/EmployeeDashboard';

// Services
import { tokenManager } from './services/api';

// Landing Page Component
const LandingPage = ({ onAuthClick }) => (
  <>
    <Navbar onAuthClick={onAuthClick} />
    <Hero onGetStarted={() => onAuthClick('signup')} />
    <Features />
    <Contact />
    <Footer />
  </>
);

function App() {
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authType, setAuthType] = useState('signin');
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Check authentication on app load
  useEffect(() => {
    const token = tokenManager.getToken();
    const userData = tokenManager.getUser();
    
    if (token && userData) {
      setUser(userData);
      setIsAuthenticated(true);
    }
  }, []);

  const handleAuthClick = (type) => {
    setAuthType(type);
    setShowAuthModal(true);
  };

  const closeAuthModal = () => {
    setShowAuthModal(false);
  };

  const handleAuthSuccess = (userData) => {
    setUser(userData);
    setIsAuthenticated(true);
    setShowAuthModal(false);
  };

  const handleLogout = () => {
    tokenManager.removeToken();
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Landing Page Route */}
          <Route 
            path="/" 
            element={
              !isAuthenticated ? (
                <LandingPage onAuthClick={handleAuthClick} />
              ) : (
                <Navigate to={user?.role === 'manager' ? '/manager-dashboard' : '/employee-dashboard'} replace />
              )
            } 
          />
          
          {/* Manager Dashboard Route */}
          <Route 
            path="/manager-dashboard" 
            element={
              isAuthenticated && user?.role === 'manager' ? (
                <ManagerDashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          
          {/* Employee Dashboard Route */}
          <Route 
            path="/employee-dashboard" 
            element={
              isAuthenticated && user?.role === 'employee' ? (
                <EmployeeDashboard user={user} onLogout={handleLogout} />
              ) : (
                <Navigate to="/" replace />
              )
            } 
          />
          
          {/* Catch all route */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
        
        {/* Auth Modal */}
        {showAuthModal && (
          <AuthModal 
            type={authType} 
            onClose={closeAuthModal}
            onSwitchType={setAuthType}
            onAuthSuccess={handleAuthSuccess}
          />
        )}
      </div>
    </Router>
  );
}

export default App;