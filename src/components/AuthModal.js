import React, { useState } from 'react';
import { authAPI, tokenManager } from '../services/api';
import './AuthModal.css';

const AuthModal = ({ type, onClose, onSwitchType, onAuthSuccess }) => {
  const [currentView, setCurrentView] = useState('role-selection'); // 'role-selection', 'manager-auth', 'employee-auth'
  const [selectedRole, setSelectedRole] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    managerCode: ''
  });

  const handleRoleSelect = (role) => {
    setSelectedRole(role);
    setCurrentView(role === 'manager' ? 'manager-auth' : 'employee-auth');
  };

  const handleBack = () => {
    setCurrentView('role-selection');
    setSelectedRole('');
    setError('');
    setFormData({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      managerCode: ''
    });
  };

  const handleChange = (e) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (type === 'signup' && formData.password !== formData.confirmPassword) {
        setError('Passwords do not match!');
        setLoading(false);
        return;
      }

      let response;

      if (type === 'signin') {
        // Login
        response = await authAPI.login({
          email: formData.email,
          password: formData.password,
          role: selectedRole
        });
      } else {
        // Sign up
        if (selectedRole === 'manager') {
          response = await authAPI.registerManager({
            name: formData.name,
            email: formData.email,
            password: formData.password
          });
        } else {
          response = await authAPI.registerEmployee({
            name: formData.name,
            email: formData.email,
            password: formData.password,
            managerCode: formData.managerCode
          });
        }
      }

      if (response.success) {
        // Store token and user data
        tokenManager.setToken(response.data.token);
        tokenManager.setUser(response.data.user);

        // Show success message
        alert(`${type === 'signin' ? 'Sign In' : 'Sign Up'} successful! Welcome ${response.data.user.name}!`);
        
        // Call success handler to update app state
        if (onAuthSuccess) {
          onAuthSuccess(response.data.user);
        }
        
        // Close modal - routing will be handled by App component
        onClose();
      }

    } catch (error) {
      console.error('Auth error:', error);
      setError(
        error.response?.data?.message || 
        'An error occurred. Please try again.'
      );
    } finally {
      setLoading(false);
    }
  };

  const renderRoleSelection = () => (
    <div className="role-selection">
      <h2>{type === 'signin' ? 'Sign In As' : 'Sign Up As'}</h2>
      <p>Choose your role to continue</p>
      
      <div className="role-cards">
        <div className="role-card" onClick={() => handleRoleSelect('manager')}>
          <div className="role-icon">👨‍💼</div>
          <h3>Manager</h3>
          <p>Manage teams, assign tasks, and track productivity</p>
          <ul>
            <li>Create and manage teams</li>
            <li>Assign tasks to team members</li>
            <li>View team work logs</li>
            <li>Generate reports</li>
          </ul>
        </div>
        
        <div className="role-card" onClick={() => handleRoleSelect('employee')}>
          <div className="role-icon">👨‍💻</div>
          <h3>Employee</h3>
          <p>Join teams, complete tasks, and log daily work</p>
          <ul>
            <li>Join teams using manager code</li>
            <li>Receive and complete tasks</li>
            <li>Log daily work activities</li>
            <li>Submit work proof</li>
          </ul>
        </div>
      </div>
    </div>
  );

  const renderAuthForm = () => (
    <div className="auth-form-container">
      <button className="back-button" onClick={handleBack}>
        ← Back to Role Selection
      </button>
      
      <div className="auth-header">
        <div className="role-badge">
          <span className="role-icon">{selectedRole === 'manager' ? '👨‍💼' : '👨‍💻'}</span>
          <span className="role-text">{selectedRole === 'manager' ? 'Manager' : 'Employee'}</span>
        </div>
        <h2>{type === 'signin' ? 'Sign In' : 'Sign Up'}</h2>
      </div>

      <form className="auth-form" onSubmit={handleSubmit}>
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}

        {type === 'signup' && (
          <div className="form-group">
            <input
              type="text"
              name="name"
              placeholder="Full Name"
              value={formData.name}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
        )}

        <div className="form-group">
          <input
            type="email"
            name="email"
            placeholder="Email Address"
            value={formData.email}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        <div className="form-group">
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            required
            disabled={loading}
          />
        </div>

        {type === 'signup' && (
          <div className="form-group">
            <input
              type="password"
              name="confirmPassword"
              placeholder="Confirm Password"
              value={formData.confirmPassword}
              onChange={handleChange}
              required
              disabled={loading}
            />
          </div>
        )}

        {selectedRole === 'employee' && (
          <div className="form-group">
            <input
              type="text"
              name="managerCode"
              placeholder="Manager Code (to join team)"
              value={formData.managerCode}
              onChange={handleChange}
              required
              disabled={loading}
            />
            <small>Enter the unique code provided by your manager</small>
          </div>
        )}

        <button type="submit" className="btn btn-primary auth-submit" disabled={loading}>
          {loading ? 'Please wait...' : (type === 'signin' ? 'Sign In' : 'Create Account')}
        </button>
      </form>

      <div className="auth-switch">
        <p>
          {type === 'signin' ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button" 
            className="switch-link"
            onClick={() => onSwitchType(type === 'signin' ? 'signup' : 'signin')}
          >
            {type === 'signin' ? 'Sign Up' : 'Sign In'}
          </button>
        </p>
      </div>
    </div>
  );

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-button" onClick={onClose}>×</button>
        
        {currentView === 'role-selection' ? renderRoleSelection() : renderAuthForm()}
      </div>
    </div>
  );
};

export default AuthModal;