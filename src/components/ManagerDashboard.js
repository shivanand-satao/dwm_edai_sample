import React, { useState, useEffect } from 'react';
import { taskAPI, teamAPI, dailyWorkAPI } from '../services/api';
import './ManagerDashboard.css';

const ManagerDashboard = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [teamMembers, setTeamMembers] = useState([]);
  const [tasks, setTasks] = useState([]);
  const [teamStats, setTeamStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [showAddTaskModal, setShowAddTaskModal] = useState(false);
  const [availableMembers, setAvailableMembers] = useState([]);
  const [teamDailyWork, setTeamDailyWork] = useState([]);
  const [showEditTaskModal, setShowEditTaskModal] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [newTask, setNewTask] = useState({
    title: '',
    description: '',
    assigned_to: [],
    due_date: '',
    priority: 'medium'
  });

  // Load data from API
  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      
      // Load all data in parallel
      const [membersResponse, tasksResponse, statsResponse, availableMembersResponse, teamWorkResponse] = await Promise.all([
        teamAPI.getTeamMembers(),
        taskAPI.getManagerTasks(),
        teamAPI.getTeamStats(),
        taskAPI.getTeamMembers(),
        dailyWorkAPI.getTeamWork()
      ]);

      if (membersResponse.success) {
        setTeamMembers(membersResponse.data);
      }

      if (tasksResponse.success) {
        setTasks(tasksResponse.data);
      }

      if (statsResponse.success) {
        setTeamStats(statsResponse.data.stats);
      }

      if (availableMembersResponse.success) {
        setAvailableMembers(availableMembersResponse.data);
      }

      if (teamWorkResponse.success) {
        setTeamDailyWork(teamWorkResponse.data);
      }

    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      alert('Failed to load dashboard data. Please refresh the page.');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateTask = async (e) => {
    e.preventDefault();
    
    try {
      const response = await taskAPI.createTask(newTask);
      
      if (response.success) {
        alert('Task created successfully!');
        setShowAddTaskModal(false);
        setNewTask({
          title: '',
          description: '',
          assigned_to: [],
          due_date: '',
          priority: 'medium'
        });
        // Reload tasks
        loadDashboardData();
      }
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('Failed to create task. Please try again.');
    }
  };

  const handleTaskInputChange = (e) => {
    const { name, value, selectedOptions } = e.target;
    
    if (name === 'assigned_to' && selectedOptions) {
      // Handle multiple select
      const selectedValues = Array.from(selectedOptions, option => option.value);
      setNewTask({
        ...newTask,
        [name]: selectedValues
      });
    } else {
      setNewTask({
        ...newTask,
        [name]: value
      });
    }
  };

  const handleEditTask = (task) => {
    setEditingTask(task);
    setNewTask({
      title: task.title,
      description: task.description,
      assigned_to: task.assignees ? task.assignees.map(a => a.id.toString()) : [task.assigned_to?.toString()],
      due_date: task.due_date.split('T')[0], // Format date for input
      priority: task.priority
    });
    setShowEditTaskModal(true);
  };

  const handleUpdateTask = async (e) => {
    e.preventDefault();
    
    try {
      const response = await taskAPI.updateTask(editingTask.id, newTask);
      
      if (response.success) {
        alert('Task updated successfully!');
        setShowEditTaskModal(false);
        setEditingTask(null);
        setNewTask({
          title: '',
          description: '',
          assigned_to: [],
          due_date: '',
          priority: 'medium'
        });
        // Reload tasks
        loadDashboardData();
      }
    } catch (error) {
      console.error('Failed to update task:', error);
      alert('Failed to update task. Please try again.');
    }
  };

  const handleDeleteTask = async (taskId, taskTitle) => {
    if (window.confirm(`Are you sure you want to delete the task "${taskTitle}"? This action cannot be undone.`)) {
      try {
        const response = await taskAPI.deleteTask(taskId);
        
        if (response.success) {
          alert('Task deleted successfully!');
          // Reload tasks
          loadDashboardData();
        }
      } catch (error) {
        console.error('Failed to delete task:', error);
        alert('Failed to delete task. Please try again.');
      }
    }
  };

  const renderTeamWork = () => (
    <div className="team-work-content">
      <div className="section-header">
        <h2>Team Daily Work</h2>
        <div className="work-filters">
          <select className="filter-select">
            <option value="all">All Team Members</option>
            {teamMembers.map(member => (
              <option key={member.id} value={member.id}>
                {member.name}
              </option>
            ))}
          </select>
          <select className="filter-select">
            <option value="7">Last 7 days</option>
            <option value="30">Last 30 days</option>
            <option value="90">Last 90 days</option>
          </select>
        </div>
      </div>

      <div className="work-timeline">
        {teamDailyWork.length === 0 ? (
          <div className="no-work-entries">
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <h3>No Work Entries Yet</h3>
              <p>Your team members haven't logged any daily work yet.</p>
            </div>
          </div>
        ) : (
          teamDailyWork.map(work => (
            <div key={work.id} className="team-work-entry">
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
                  <div className="work-title">
                    <h3>{work.project_name}</h3>
                    <div className="employee-info">
                      <span className="employee-name">👤 {work.employee_name}</span>
                      <span className="hours-worked">⏱️ {work.hours_worked} hours</span>
                    </div>
                  </div>
                  <div className="work-actions">
                    <button className="action-btn view" title="View Details">👁️</button>
                  </div>
                </div>
                
                <p className="work-description">{work.work_description}</p>
                
                {work.achievements && (
                  <div className="achievements">
                    <strong>🎯 Achievements:</strong> {work.achievements}
                  </div>
                )}
                
                {work.challenges_faced && (
                  <div className="challenges">
                    <strong>⚠️ Challenges:</strong> {work.challenges_faced}
                  </div>
                )}
                
                <div className="work-meta">
                  <span className="work-category">
                    📂 {work.work_category || 'General'}
                  </span>
                  <span className="mood-rating">
                    😊 Mood: {work.mood_rating || 'neutral'}
                  </span>
                  <span className="logged-time">
                    🕒 Logged: {new Date(work.created_at).toLocaleDateString()}
                  </span>
                </div>
                
                {work.attachments && work.attachments.length > 0 && (
                  <div className="work-attachments">
                    <strong>📎 Attachments:</strong>
                    <div className="attachment-list">
                      {work.attachments.map((attachment, index) => (
                        <a 
                          key={index}
                          href={`http://localhost:5000/${attachment.file_path}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="attachment-link"
                        >
                          📄 {attachment.file_name}
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );

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

  const renderOverview = () => (
    <div className="overview-content">
      <div className="stats-grid">
        <div className="stat-card">
          <div className="stat-icon">👥</div>
          <div className="stat-info">
            <h3>{teamStats.total_members || 0}</h3>
            <p>Team Members</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">📋</div>
          <div className="stat-info">
            <h3>{teamStats.total_tasks || 0}</h3>
            <p>Total Tasks</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">✅</div>
          <div className="stat-info">
            <h3>{teamStats.completed_tasks || 0}</h3>
            <p>Completed</p>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">⏳</div>
          <div className="stat-info">
            <h3>{teamStats.in_progress_tasks || 0}</h3>
            <p>In Progress</p>
          </div>
        </div>
      </div>

      <div className="dashboard-grid">
        <div className="dashboard-card">
          <h3>Recent Tasks</h3>
          <div className="task-list">
            {tasks.slice(0, 3).map(task => (
              <div key={task.id} className="task-item">
                <div className="task-info">
                  <h4>{task.title}</h4>
                  <p>Assigned to: {task.assigned_to_name}</p>
                </div>
                <div className="task-meta">
                  <span 
                    className="status-badge" 
                    style={{ backgroundColor: getStatusColor(task.status) }}
                  >
                    {task.status.replace('_', ' ')}
                  </span>
                  <span className="due-date">Due: {new Date(task.due_date).toLocaleDateString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="dashboard-card">
          <h3>Team Performance</h3>
          <div className="team-performance">
            {teamMembers.map(member => (
              <div key={member.id} className="performance-item">
                <div className="member-info">
                  <h4>{member.name}</h4>
                  <p>{member.email}</p>
                </div>
                <div className="performance-stats">
                  <span className="tasks-completed">{member.completed_tasks} tasks</span>
                  <div className="progress-bar">
                    <div 
                      className="progress-fill" 
                      style={{ width: `${Math.min((member.completed_tasks / Math.max(member.total_tasks, 1)) * 100, 100)}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );

  const renderTeam = () => (
    <div className="team-content">
      <div className="section-header">
        <h2>Team Members</h2>
        <div className="manager-code-display">
          <span>Manager Code: </span>
          <code>{user.manager_code}</code>
          <button className="copy-btn" onClick={() => navigator.clipboard.writeText(user.manager_code)}>
            📋 Copy
          </button>
        </div>
      </div>
      
      <div className="team-grid">
        {teamMembers.map(member => (
          <div key={member.id} className="team-member-card">
            <div className="member-avatar">
              {member.name.split(' ').map(n => n[0]).join('')}
            </div>
            <div className="member-details">
              <h3>{member.name}</h3>
              <p>{member.email}</p>
              <div className="member-stats">
                <span className="stat">
                  <strong>{member.completed_tasks}</strong> tasks completed
                </span>
                <span className={`status ${member.is_active ? 'active' : 'inactive'}`}>
                  {member.is_active ? 'active' : 'inactive'}
                </span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderTasks = () => (
    <div className="tasks-content">
      <div className="section-header">
        <h2>Task Management</h2>
        <button 
          className="btn btn-primary"
          onClick={() => setShowAddTaskModal(true)}
        >
          + Add New Task
        </button>
      </div>
      
      <div className="tasks-table">
        <div className="table-header">
          <div>Task</div>
          <div>Assigned To</div>
          <div>Status</div>
          <div>Priority</div>
          <div>Due Date</div>
          <div>Actions</div>
        </div>
        
        {tasks.map(task => (
          <div key={task.id} className="table-row">
            <div className="task-title">{task.title}</div>
            <div>{task.assigned_to_name}</div>
            <div>
              <span 
                className="status-badge" 
                style={{ backgroundColor: getStatusColor(task.status) }}
              >
                {task.status.replace('_', ' ')}
              </span>
            </div>
            <div>
              <span 
                className="priority-badge"
                style={{ color: getPriorityColor(task.priority) }}
              >
                {task.priority}
              </span>
            </div>
            <div>{new Date(task.due_date).toLocaleDateString()}</div>
            <div className="task-actions">
              <button 
                className="action-btn edit" 
                onClick={() => handleEditTask(task)}
                title="Edit Task"
              >
                ✏️
              </button>
              <button 
                className="action-btn delete" 
                onClick={() => handleDeleteTask(task.id, task.title)}
                title="Delete Task"
              >
                🗑️
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <div className="manager-dashboard">
      <nav className="dashboard-nav">
        <div className="nav-brand">
          <h2>TeamSync Manager</h2>
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
              <span className="role-badge manager">Manager</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            <button 
              className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <span className="nav-icon">📊</span>
              Overview
            </button>
            <button 
              className={`nav-item ${activeTab === 'team' ? 'active' : ''}`}
              onClick={() => setActiveTab('team')}
            >
              <span className="nav-icon">👥</span>
              Team Members
            </button>
            <button 
              className={`nav-item ${activeTab === 'tasks' ? 'active' : ''}`}
              onClick={() => setActiveTab('tasks')}
            >
              <span className="nav-icon">📋</span>
              Tasks
            </button>
            <button 
              className={`nav-item ${activeTab === 'team-work' ? 'active' : ''}`}
              onClick={() => setActiveTab('team-work')}
            >
              <span className="nav-icon">📝</span>
              Team Work
            </button>
            <button 
              className={`nav-item ${activeTab === 'analytics' ? 'active' : ''}`}
              onClick={() => setActiveTab('analytics')}
            >
              <span className="nav-icon">📈</span>
              Analytics
            </button>
          </nav>
        </aside>

        <main className="dashboard-main">
          {loading ? (
            <div className="loading-state">
              <div className="loading-spinner"></div>
              <p>Loading dashboard data...</p>
            </div>
          ) : (
            <>
              {activeTab === 'overview' && renderOverview()}
              {activeTab === 'team' && renderTeam()}
              {activeTab === 'tasks' && renderTasks()}
              {activeTab === 'team-work' && renderTeamWork()}
              {activeTab === 'analytics' && (
                <div className="analytics-content">
                  <h2>Analytics & Reports</h2>
                  <p>Coming soon - AI-powered team analytics and productivity insights!</p>
                </div>
              )}
            </>
          )}
        </main>
      </div>

      {/* Add Task Modal */}
      {showAddTaskModal && (
        <div className="modal-overlay" onClick={() => setShowAddTaskModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Add New Task</h3>
            <form onSubmit={handleCreateTask}>
              <div className="form-group">
                <label>Task Title</label>
                <input
                  type="text"
                  name="title"
                  value={newTask.title}
                  onChange={handleTaskInputChange}
                  placeholder="Enter task title..."
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={newTask.description}
                  onChange={handleTaskInputChange}
                  placeholder="Enter task description..."
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label>Assign To (Hold Ctrl/Cmd to select multiple)</label>
                <select
                  name="assigned_to"
                  value={newTask.assigned_to}
                  onChange={handleTaskInputChange}
                  multiple
                  required
                  className="multi-select"
                >
                  {availableMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.email})
                    </option>
                  ))}
                </select>
                <small>Hold Ctrl (Windows) or Cmd (Mac) to select multiple team members</small>
              </div>
              
              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  name="due_date"
                  value={newTask.due_date}
                  onChange={handleTaskInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Priority</label>
                <select
                  name="priority"
                  value={newTask.priority}
                  onChange={handleTaskInputChange}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              
              <div className="modal-actions">
                <button type="button" onClick={() => setShowAddTaskModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Create Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Task Modal */}
      {showEditTaskModal && editingTask && (
        <div className="modal-overlay" onClick={() => setShowEditTaskModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Edit Task</h3>
            <form onSubmit={handleUpdateTask}>
              <div className="form-group">
                <label>Task Title</label>
                <input
                  type="text"
                  name="title"
                  value={newTask.title}
                  onChange={handleTaskInputChange}
                  placeholder="Enter task title..."
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Description</label>
                <textarea
                  name="description"
                  value={newTask.description}
                  onChange={handleTaskInputChange}
                  placeholder="Enter task description..."
                  rows="3"
                />
              </div>
              
              <div className="form-group">
                <label>Assign To (Hold Ctrl/Cmd to select multiple)</label>
                <select
                  name="assigned_to"
                  value={newTask.assigned_to}
                  onChange={handleTaskInputChange}
                  multiple
                  required
                  className="multi-select"
                >
                  {availableMembers.map(member => (
                    <option key={member.id} value={member.id}>
                      {member.name} ({member.email})
                    </option>
                  ))}
                </select>
                <small>Hold Ctrl (Windows) or Cmd (Mac) to select multiple team members</small>
              </div>
              
              <div className="form-group">
                <label>Due Date</label>
                <input
                  type="date"
                  name="due_date"
                  value={newTask.due_date}
                  onChange={handleTaskInputChange}
                  required
                />
              </div>
              
              <div className="form-group">
                <label>Priority</label>
                <select
                  name="priority"
                  value={newTask.priority}
                  onChange={handleTaskInputChange}
                >
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
                </select>
              </div>
              
              <div className="modal-actions">
                <button type="button" onClick={() => setShowEditTaskModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  Update Task
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ManagerDashboard;