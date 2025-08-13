import React, { useState, useEffect } from 'react';
import { taskAPI, dailyWorkAPI, teamAPI } from '../services/api';
import './EmployeeDashboard.css';

const EmployeeDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('tasks');
  const [myTasks, setMyTasks] = useState([]);
  const [dailyWork, setDailyWork] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showTaskSubmission, setShowTaskSubmission] = useState(null);
  const [showDailyWorkModal, setShowDailyWorkModal] = useState(false);
  const [newWorkEntry, setNewWorkEntry] = useState({
    work_date: new Date().toISOString().split('T')[0],
    work_description: '',
    hours_worked: '',
    project_name: '',
    achievements: ''
  });
  const [taskSubmission, setTaskSubmission] = useState({
    submission_text: '',
    file_path: '',
    file_name: ''
  });

  // Load data from API
  useEffect(() => {
    loadEmployeeData();
  }, []);

  const loadEmployeeData = async () => {
    try {
      setLoading(true);
      
      // Load tasks and daily work in parallel
      const [tasksResponse, workResponse] = await Promise.all([
        taskAPI.getEmployeeTasks(),
        dailyWorkAPI.getEmployeeWork()
      ]);

      if (tasksResponse.success) {
        setMyTasks(tasksResponse.data);
      }

      if (workResponse.success) {
        setDailyWork(workResponse.data);
      }

    } catch (error) {
      console.error('Failed to load employee data:', error);
      alert('Failed to load data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'completed': return '#38a169';
      case 'in_progress': return '#ed8936';
      case 'pending': return '#cbd5e0';
      case 'overdue': return '#e53e3e';
      default: return '#cbd5e0';
    }
  };

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return '#e53e3e';
      case 'medium': return '#ed8936';
      case 'low': return '#38a169';
      case 'urgent': return '#9f1239';
      default: return '#718096';
    }
  };

  const handleTaskSubmission = (taskId) => {
    setShowTaskSubmission(taskId);
  };

  const handleStartTask = async (taskId) => {
    try {
      const response = await taskAPI.updateTaskStatus(taskId, 'in_progress');
      if (response.success) {
        loadEmployeeData(); // Reload data
      }
    } catch (error) {
      console.error('Failed to start task:', error);
      alert('Failed to start task. Please try again.');
    }
  };

  const handleSubmitTask = async (e) => {
    e.preventDefault();
    
    try {
      const formData = new FormData();
      formData.append('submission_text', taskSubmission.submission_text);
      
      // Add files if any
      const fileInput = e.target.querySelector('input[type="file"]');
      if (fileInput && fileInput.files.length > 0) {
        for (let i = 0; i < fileInput.files.length; i++) {
          formData.append('files', fileInput.files[i]);
        }
      }

      const response = await fetch(`http://localhost:5000/api/tasks/${showTaskSubmission}/submit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('authToken')}`
        },
        body: formData
      });

      const result = await response.json();
      
      if (result.success) {
        alert('Task submitted successfully!');
        setShowTaskSubmission(null);
        setTaskSubmission({
          submission_text: '',
          file_path: '',
          file_name: ''
        });
        loadEmployeeData(); // Reload data
      } else {
        alert(result.message || 'Failed to submit task');
      }
    } catch (error) {
      console.error('Failed to submit task:', error);
      alert('Failed to submit task. Please try again.');
    }
  };

  const handleCreateWorkEntry = async (e) => {
    e.preventDefault();
    
    try {
      const response = await dailyWorkAPI.createWorkEntry(newWorkEntry);
      
      if (response.success) {
        alert('Daily work entry added successfully!');
        setShowDailyWorkModal(false);
        setNewWorkEntry({
          work_date: new Date().toISOString().split('T')[0],
          work_description: '',
          hours_worked: '',
          project_name: '',
          achievements: ''
        });
        loadEmployeeData(); // Reload data
      }
    } catch (error) {
      console.error('Failed to create work entry:', error);
      alert('Failed to create work entry. Please try again.');
    }
  };

  const handleWorkInputChange = (e) => {
    setNewWorkEntry({
      ...newWorkEntry,
      [e.target.name]: e.target.value
    });
  };

  const handleSubmissionInputChange = (e) => {
    setTaskSubmission({
      ...taskSubmission,
      [e.target.name]: e.target.value
    });
  };

  const renderTasks = () => (
    <div className="tasks-content">
      <div className="section-header">
        <h2>My Tasks</h2>
        <div className="task-stats">
          <span className="stat">
            <strong>{myTasks.filter(t => t.status === 'pending').length}</strong> Pending
          </span>
          <span className="stat">
            <strong>{myTasks.filter(t => t.status === 'in_progress').length}</strong> In Progress
          </span>
          <span className="stat">
            <strong>{myTasks.filter(t => t.status === 'completed').length}</strong> Completed
          </span>
        </div>
      </div>

      <div className="tasks-grid">
        {myTasks.map(task => (
          <div key={task.id} className="task-card">
            <div className="task-header">
              <h3>{task.title}</h3>
              <div className="task-meta">
                <span 
                  className="status-badge" 
                  style={{ backgroundColor: getStatusColor(task.status) }}
                >
                  {task.status.replace('_', ' ')}
                </span>
                <span 
                  className="priority-badge"
                  style={{ color: getPriorityColor(task.priority) }}
                >
                  {task.priority}
                </span>
              </div>
            </div>
            
            <p className="task-description">{task.description}</p>
            
            <div className="task-details">
              <div className="detail-item">
                <span className="label">Assigned by:</span>
                <span>{task.assigned_by_name}</span>
              </div>
              <div className="detail-item">
                <span className="label">Due date:</span>
                <span>{new Date(task.due_date).toLocaleDateString()}</span>
              </div>
            </div>
            
            <div className="task-actions">
              {task.status === 'pending' && (
                <button 
                  className="btn btn-primary"
                  onClick={() => handleStartTask(task.id)}
                >
                  Start Task
                </button>
              )}
              {task.status === 'in_progress' && (
                <button 
                  className="btn btn-success"
                  onClick={() => handleTaskSubmission(task.id)}
                >
                  Submit Work
                </button>
              )}
              {task.status === 'completed' && (
                <span className="completed-badge">✅ Completed</span>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderDailyWork = () => (
    <div className="daily-work-content">
      <div className="section-header">
        <h2>Daily Work Log</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowDailyWorkModal(true)}
        >
          + Add Today's Work
        </button>
      </div>

      <div className="work-timeline">
        {dailyWork.map(work => (
          <div key={work.id} className="work-entry">
            <div className="work-date">
              <div className="date-circle">
                {new Date(work.work_date).getDate()}
              </div>
              <div className="date-info">
                <div className="month">
                  {new Date(work.work_date).toLocaleDateString('en', { month: 'short' })}
                </div>
                <div className="year">
                  {new Date(work.work_date).getFullYear()}
                </div>
              </div>
            </div>
            
            <div className="work-details">
              <div className="work-header">
                <h3>{work.project_name}</h3>
                <span className="hours-worked">{work.hours_worked} hours</span>
              </div>
              <p className="work-description">{work.work_description}</p>
              {work.achievements && (
                <div className="achievements">
                  <strong>Achievements:</strong> {work.achievements}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderProfile = () => (
    <div className="profile-content">
      <div className="profile-card">
        <div className="profile-header">
          <div className="profile-avatar-large">
            {user.name.split(' ').map(n => n[0]).join('')}
          </div>
          <div className="profile-info">
            <h2>{user.name}</h2>
            <p>{user.email}</p>
            <span className="role-badge employee">Employee</span>
          </div>
        </div>
        
        <div className="profile-stats">
          <div className="stat-item">
            <h3>{myTasks.length}</h3>
            <p>Total Tasks</p>
          </div>
          <div className="stat-item">
            <h3>{myTasks.filter(t => t.status === 'completed').length}</h3>
            <p>Completed</p>
          </div>
          <div className="stat-item">
            <h3>{dailyWork.length}</h3>
            <p>Work Entries</p>
          </div>
          <div className="stat-item">
            <h3>{dailyWork.reduce((sum, work) => sum + work.hoursWorked, 0)}</h3>
            <p>Total Hours</p>
          </div>
        </div>
        
        <div className="team-info">
          <h3>Team Information</h3>
          <div className="team-details">
            <div className="detail-row">
              <span>Team:</span>
              <span>{user.team_name || 'Development Team'}</span>
            </div>
            <div className="detail-row">
              <span>Manager Code:</span>
              <span>{user.manager_code || 'MGR-ABC123'}</span>
            </div>
            <div className="detail-row">
              <span>Join Date:</span>
              <span>January 15, 2024</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="employee-dashboard">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <h2>TeamSync Employee</h2>
        </div>
        <div className="nav-user">
          <span>Welcome, {user.name}</span>
          <button className="logout-btn" onClick={onLogout}>
            Logout
          </button>
        </div>
      </nav>

      <div className="dashboard-container">
        <aside className="dashboard-sidebar">
          <div className="user-profile">
            <div className="profile-avatar">
              {user.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="profile-info">
              <h3>{user.name}</h3>
              <p>{user.email}</p>
              <span className="role-badge employee">Employee</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
              onClick={() => setActiveTab('tasks')}
            >
              <span className="nav-icon">📋</span>
              My Tasks
            </button>
            <button 
              className={`nav-item ${activeTab === 'daily-work' ? 'active' : ''}`}
              onClick={() => setActiveTab('daily-work')}
            >
              <span className="nav-icon">📝</span>
              Daily Work
            </button>
            <button 
              className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`}
              onClick={() => setActiveTab('profile')}
            >
              <span className="nav-icon">👤</span>
              Profile
            </button>
          </nav>
        </aside>

        <main className="dashboard-main">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading your data...</p>
            </div>
          ) : (
            <>
              {activeTab === 'tasks' && renderTasks()}
              {activeTab === 'daily-work' && renderDailyWork()}
              {activeTab === 'profile' && renderProfile()}
            </>
          )}
        </main>
      </div>

      {/* Task Submission Modal */}
      {showTaskSubmission && (
        <div className="modal-overlay" onClick={() => setShowTaskSubmission(null)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Submit Task Work</h3>
            <form onSubmit={handleSubmitTask}>
              <div className="form-group">
                <label>Work Description</label>
                <textarea 
                  name="submission_text"
                  value={taskSubmission.submission_text}
                  onChange={handleSubmissionInputChange}
                  placeholder="Describe what you accomplished..."
                  required
                />
              </div>
              <div className="form-group">
                <label>Upload Files (Optional)</label>
                <input 
                  type="file" 
                  multiple 
                  accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.jpg,.jpeg,.png,.gif,.zip,.rar,.js,.html,.css,.json,.xml"
                />
                <small>
                  Allowed: PDF, DOC, DOCX, XLS, XLSX, PPT, PPTX, TXT, CSV, JPG, PNG, GIF, ZIP, RAR, JS, HTML, CSS, JSON, XML (Max 10MB each, 5 files max)
                </small>
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowTaskSubmission(null)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Submit Work
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Daily Work Modal */}
      {showDailyWorkModal && (
        <div className="modal-overlay" onClick={() => setShowDailyWorkModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add Daily Work Entry</h3>
            <form onSubmit={handleCreateWorkEntry}>
              <div className="form-group">
                <label>Date</label>
                <input 
                  type="date" 
                  name="work_date"
                  value={newWorkEntry.work_date}
                  onChange={handleWorkInputChange}
                  required
                />
              </div>
              <div className="form-group">
                <label>Project Name</label>
                <input 
                  type="text" 
                  name="project_name"
                  value={newWorkEntry.project_name}
                  onChange={handleWorkInputChange}
                  placeholder="Enter project name..." 
                  required
                />
              </div>
              <div className="form-group">
                <label>Work Description</label>
                <textarea 
                  name="work_description"
                  value={newWorkEntry.work_description}
                  onChange={handleWorkInputChange}
                  placeholder="Describe what you worked on today..."
                  required
                />
              </div>
              <div className="form-group">
                <label>Hours Worked</label>
                <input 
                  type="number" 
                  step="0.5" 
                  name="hours_worked"
                  value={newWorkEntry.hours_worked}
                  onChange={handleWorkInputChange}
                  placeholder="8.0" 
                  required
                />
              </div>
              <div className="form-group">
                <label>Achievements (Optional)</label>
                <textarea 
                  name="achievements"
                  value={newWorkEntry.achievements}
                  onChange={handleWorkInputChange}
                  placeholder="What did you accomplish?"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => setShowDailyWorkModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Save Entry
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDashboard;