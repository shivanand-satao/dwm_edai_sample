import React from 'react';
import './Features.css';

const Features = () => {
  const features = [
    {
      icon: '👥',
      title: 'Team Management',
      description: 'Create teams with unique manager codes. Employees join using manager IDs for seamless team organization.'
    },
    {
      icon: '📋',
      title: 'Task Assignment',
      description: 'Managers can assign tasks with due dates, priorities, and detailed descriptions to team members.'
    },
    {
      icon: '📊',
      title: 'Daily Work Tracking',
      description: 'Employees log their daily work activities. Managers get complete visibility of team productivity.'
    },
    {
      icon: '📎',
      title: 'Proof Submission',
      description: 'Team members submit proof of work completion with documents and files before due dates.'
    },
    {
      icon: '🔍',
      title: 'Work Analytics',
      description: 'Advanced analytics and AI-powered insights to understand work patterns and productivity trends.'
    },
    {
      icon: '🔔',
      title: 'Smart Notifications',
      description: 'Get notified about task assignments, due dates, submissions, and important team updates.'
    }
  ];

  return (
    <section id="features" className="features">
      <div className="container">
        <div className="features-header fade-in-up">
          <h2>Powerful Features for Modern Teams</h2>
          <p>Everything you need to manage your team effectively and boost productivity</p>
        </div>
        
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className="feature-card fade-in-up" style={{animationDelay: `${index * 0.1}s`}}>
              <div className="feature-icon">
                {feature.icon}
              </div>
              <h3>{feature.title}</h3>
              <p>{feature.description}</p>
            </div>
          ))}
        </div>
        
        <div className="features-cta fade-in-up">
          <h3>Ready to transform your team management?</h3>
          <button className="btn btn-primary">Start Free Trial</button>
        </div>
      </div>
    </section>
  );
};

export default Features;