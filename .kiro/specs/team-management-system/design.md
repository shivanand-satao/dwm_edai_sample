# Design Document

## Overview

The Team Management System is designed as a multi-tenant application with MySQL database backend, supporting multiple independent teams with role-based access control. The system uses a normalized database schema with multiple related tables to ensure data integrity, efficient queries, and analytics readiness.

## Architecture

### System Architecture
- **Frontend**: React with TypeScript for type safety
- **Backend**: Node.js with Express.js REST API
- **Database**: MySQL with normalized schema using multiple related tables
- **Authentication**: JWT-based authentication with role-based access control
- **File Storage**: Local file system for proof documents (can be extended to cloud storage)

### Database Design Philosophy
- **Normalization**: Multiple tables with proper relationships to eliminate data redundancy
- **Analytics Ready**: Structured data with consistent formats for future AI/ML analysis
- **Scalability**: Indexed tables with efficient join operations
- **Data Integrity**: Foreign key constraints and proper data types

## Components and Interfaces

### Database Schema

#### 1. Users Table
```sql
CREATE TABLE users (
    id INT PRIMARY KEY AUTO_INCREMENT,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    role ENUM('manager', 'employee') NOT NULL,
    team_id INT,
    manager_id VARCHAR(50), -- Used for joining teams
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE SET NULL,
    INDEX idx_email (email),
    INDEX idx_team_id (team_id),
    INDEX idx_manager_id (manager_id)
);
```

#### 2. Teams Table
```sql
CREATE TABLE teams (
    id INT PRIMARY KEY AUTO_INCREMENT,
    team_name VARCHAR(255) NOT NULL,
    manager_id INT NOT NULL,
    manager_code VARCHAR(50) UNIQUE NOT NULL, -- Random code for team joining
    description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (manager_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_manager_code (manager_code),
    INDEX idx_manager_id (manager_id)
);
```

#### 3. Tasks Table
```sql
CREATE TABLE tasks (
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(255) NOT NULL,
    description TEXT,
    assigned_by INT NOT NULL, -- Manager who assigned
    assigned_to INT NOT NULL, -- Employee assigned to
    team_id INT NOT NULL,
    due_date DATETIME NOT NULL,
    priority ENUM('low', 'medium', 'high', 'urgent') DEFAULT 'medium',
    status ENUM('pending', 'in_progress', 'completed', 'overdue') DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    completed_at TIMESTAMP NULL,
    
    FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    INDEX idx_assigned_to (assigned_to),
    INDEX idx_team_id (team_id),
    INDEX idx_due_date (due_date),
    INDEX idx_status (status)
);
```

#### 4. Task Submissions Table
```sql
CREATE TABLE task_submissions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    task_id INT NOT NULL,
    submitted_by INT NOT NULL,
    submission_text TEXT,
    file_path VARCHAR(500), -- Path to uploaded proof file
    file_name VARCHAR(255),
    file_size INT,
    submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_late BOOLEAN DEFAULT FALSE,
    
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE,
    FOREIGN KEY (submitted_by) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_task_id (task_id),
    INDEX idx_submitted_by (submitted_by),
    INDEX idx_submitted_at (submitted_at)
);
```

#### 5. Daily Work Logs Table
```sql
CREATE TABLE daily_work_logs (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    team_id INT NOT NULL,
    work_date DATE NOT NULL,
    work_description TEXT NOT NULL,
    hours_spent DECIMAL(4,2), -- Hours worked (e.g., 7.5)
    work_category VARCHAR(100), -- For analytics (development, meeting, research, etc.)
    productivity_rating TINYINT, -- Self-assessment 1-5 scale
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (team_id) REFERENCES teams(id) ON DELETE CASCADE,
    UNIQUE KEY unique_user_date (user_id, work_date),
    INDEX idx_user_id (user_id),
    INDEX idx_team_id (team_id),
    INDEX idx_work_date (work_date),
    INDEX idx_work_category (work_category)
);
```

#### 6. User Sessions Table (for JWT management)
```sql
CREATE TABLE user_sessions (
    id INT PRIMARY KEY AUTO_INCREMENT,
    user_id INT NOT NULL,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_id (user_id),
    INDEX idx_token_hash (token_hash),
    INDEX idx_expires_at (expires_at)
);
```

### API Endpoints Design

#### Authentication Endpoints
- `POST /api/auth/register` - User registration
- `POST /api/auth/login` - User login
- `POST /api/auth/logout` - User logout
- `GET /api/auth/verify` - Verify JWT token

#### Team Management Endpoints
- `GET /api/teams/my-team` - Get current user's team info
- `POST /api/teams/join` - Join team using manager code
- `GET /api/teams/members` - Get team members (manager only)

#### Task Management Endpoints
- `POST /api/tasks` - Create new task (manager only)
- `GET /api/tasks` - Get tasks (filtered by role)
- `PUT /api/tasks/:id` - Update task
- `DELETE /api/tasks/:id` - Delete task (manager only)
- `POST /api/tasks/:id/submit` - Submit task proof
- `GET /api/tasks/:id/submissions` - Get task submissions

#### Daily Work Endpoints
- `POST /api/work-logs` - Create daily work log
- `GET /api/work-logs` - Get work logs (filtered by role)
- `PUT /api/work-logs/:id` - Update work log
- `GET /api/work-logs/analytics` - Get work analytics data

## Data Models

### User Model
```typescript
interface User {
  id: number;
  email: string;
  firstName: string;
  lastName: string;
  role: 'manager' | 'employee';
  teamId?: number;
  managerId?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}
```

### Team Model
```typescript
interface Team {
  id: number;
  teamName: string;
  managerId: number;
  managerCode: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  isActive: boolean;
}
```

### Task Model
```typescript
interface Task {
  id: number;
  title: string;
  description?: string;
  assignedBy: number;
  assignedTo: number;
  teamId: number;
  dueDate: Date;
  priority: 'low' | 'medium' | 'high' | 'urgent';
  status: 'pending' | 'in_progress' | 'completed' | 'overdue';
  createdAt: Date;
  updatedAt: Date;
  completedAt?: Date;
}
```

### Daily Work Log Model
```typescript
interface DailyWorkLog {
  id: number;
  userId: number;
  teamId: number;
  workDate: Date;
  workDescription: string;
  hoursSpent?: number;
  workCategory?: string;
  productivityRating?: number;
  createdAt: Date;
  updatedAt: Date;
}
```

## Error Handling

### Database Error Handling
- Connection failures: Implement connection pooling and retry logic
- Constraint violations: Return appropriate HTTP status codes with descriptive messages
- Transaction failures: Implement rollback mechanisms for data consistency

### API Error Responses
```typescript
interface ErrorResponse {
  success: false;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: Date;
}
```

### Common Error Scenarios
- Invalid manager code during team joining
- Unauthorized access to other teams' data
- File upload failures for task submissions
- Duplicate daily work log entries

## Testing Strategy

### Database Testing
- Unit tests for database connection and query functions
- Integration tests for complex joins and data relationships
- Performance tests for analytics queries with large datasets
- Data integrity tests for foreign key constraints

### API Testing
- Unit tests for individual endpoint logic
- Integration tests for complete user workflows
- Authentication and authorization tests
- File upload and download tests

### Analytics Preparation Testing
- Data consistency tests across related tables
- Query performance tests for reporting scenarios
- Data export tests for ML model preparation

## Analytics Considerations

### Data Structure for AI Analysis
- Consistent categorization of work types
- Temporal data with proper indexing for time-series analysis
- Quantifiable metrics (hours, completion rates, etc.)
- Relationship data for team dynamics analysis

### Future Analytics Queries
```sql
-- Employee productivity trends
SELECT u.first_name, u.last_name, 
       AVG(dwl.hours_spent) as avg_hours,
       AVG(dwl.productivity_rating) as avg_rating,
       COUNT(t.id) as tasks_completed
FROM users u
LEFT JOIN daily_work_logs dwl ON u.id = dwl.user_id
LEFT JOIN tasks t ON u.id = t.assigned_to AND t.status = 'completed'
WHERE u.team_id = ? AND dwl.work_date BETWEEN ? AND ?
GROUP BY u.id;

-- Team performance comparison
SELECT t.team_name,
       COUNT(DISTINCT u.id) as team_size,
       AVG(dwl.hours_spent) as avg_daily_hours,
       COUNT(tasks.id) as total_tasks,
       SUM(CASE WHEN tasks.status = 'completed' THEN 1 ELSE 0 END) as completed_tasks
FROM teams t
JOIN users u ON t.id = u.team_id
LEFT JOIN daily_work_logs dwl ON u.id = dwl.user_id
LEFT JOIN tasks ON u.id = tasks.assigned_to
GROUP BY t.id;
```

## Security Considerations

### Data Protection
- Password hashing using bcrypt
- JWT token expiration and refresh mechanisms
- Input validation and sanitization
- SQL injection prevention through parameterized queries

### Access Control
- Role-based access control (RBAC)
- Team-based data isolation
- File upload restrictions and validation
- Rate limiting for API endpoints