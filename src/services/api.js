import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid
      localStorage.removeItem('authToken');
      localStorage.removeItem('user');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

// Authentication API calls
export const authAPI = {
  // Register Manager
  registerManager: async (userData) => {
    const response = await api.post('/auth/register/manager', userData);
    return response.data;
  },

  // Register Employee
  registerEmployee: async (userData) => {
    const response = await api.post('/auth/register/employee', userData);
    return response.data;
  },

  // Login
  login: async (credentials) => {
    const response = await api.post('/auth/login', credentials);
    return response.data;
  },

  // Health check
  healthCheck: async () => {
    const response = await api.get('/health');
    return response.data;
  }
};

// Task API calls
export const taskAPI = {
  // Get manager tasks
  getManagerTasks: async () => {
    const response = await api.get('/tasks/manager');
    return response.data;
  },

  // Get employee tasks
  getEmployeeTasks: async () => {
    const response = await api.get('/tasks/employee');
    return response.data;
  },

  // Create new task
  createTask: async (taskData) => {
    const response = await api.post('/tasks', taskData);
    return response.data;
  },

  // Update task status
  updateTaskStatus: async (taskId, status) => {
    const response = await api.patch(`/tasks/${taskId}/status`, { status });
    return response.data;
  },

  // Submit task work
  submitTask: async (taskId, submissionData) => {
    const response = await api.post(`/tasks/${taskId}/submit`, submissionData);
    return response.data;
  },

  // Get team members for task assignment
  getTeamMembers: async () => {
    const response = await api.get('/tasks/team-members');
    return response.data;
  },

  // Update task
  updateTask: async (taskId, taskData) => {
    const response = await api.put(`/tasks/${taskId}`, taskData);
    return response.data;
  },

  // Delete task
  deleteTask: async (taskId) => {
    const response = await api.delete(`/tasks/${taskId}`);
    return response.data;
  }
};

// Daily Work API calls
export const dailyWorkAPI = {
  // Get employee daily work
  getEmployeeWork: async () => {
    const response = await api.get('/daily-work/employee');
    return response.data;
  },

  // Get team daily work (manager)
  getTeamWork: async () => {
    const response = await api.get('/daily-work/team');
    return response.data;
  },

  // Create daily work entry
  createWorkEntry: async (workData) => {
    const response = await api.post('/daily-work', workData);
    return response.data;
  },

  // Update daily work entry
  updateWorkEntry: async (entryId, workData) => {
    const response = await api.put(`/daily-work/${entryId}`, workData);
    return response.data;
  },

  // Delete daily work entry
  deleteWorkEntry: async (entryId) => {
    const response = await api.delete(`/daily-work/${entryId}`);
    return response.data;
  },

  // Get work statistics
  getWorkStats: async () => {
    const response = await api.get('/daily-work/stats');
    return response.data;
  }
};

// Team API calls
export const teamAPI = {
  // Get team members
  getTeamMembers: async () => {
    const response = await api.get('/team/members');
    return response.data;
  },

  // Get team statistics
  getTeamStats: async () => {
    const response = await api.get('/team/stats');
    return response.data;
  },

  // Get team performance
  getTeamPerformance: async () => {
    const response = await api.get('/team/performance');
    return response.data;
  },

  // Update team member status
  updateMemberStatus: async (memberId, isActive) => {
    const response = await api.patch(`/team/members/${memberId}/status`, { is_active: isActive });
    return response.data;
  },

  // Get team info
  getTeamInfo: async () => {
    const response = await api.get('/team/info');
    return response.data;
  }
};

// Helper functions for token management
export const tokenManager = {
  setToken: (token) => {
    localStorage.setItem('authToken', token);
  },

  getToken: () => {
    return localStorage.getItem('authToken');
  },

  removeToken: () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
  },

  setUser: (user) => {
    localStorage.setItem('user', JSON.stringify(user));
  },

  getUser: () => {
    const user = localStorage.getItem('user');
    return user ? JSON.parse(user) : null;
  },

  isAuthenticated: () => {
    return !!localStorage.getItem('authToken');
  }
};

export default api;