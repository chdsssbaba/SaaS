# API Documentation
## Multi-Tenant SaaS Platform

Base URL: `http://localhost:5000/api`

All API responses follow this format:
```json
{
  "success": true/false,
  "data": { ... },
  "message": "Optional message"
}
```

### API Request Flow

```mermaid
flowchart LR
    A[Client] -->|HTTP Request| B[Express API]
    B --> C{Auth Required?}
    C -->|No| D[Public Endpoint]
    C -->|Yes| E[Verify JWT]
    E --> F{Valid Token?}
    F -->|No| G[401 Unauthorized]
    F -->|Yes| H[Check Permissions]
    H --> I{Authorized?}
    I -->|No| J[403 Forbidden]
    I -->|Yes| K[Process Request]
    K --> L[Return Response]
    D --> L
    
    style A fill:#4ecdc4,stroke:#333,stroke-width:2px
    style B fill:#68a063,stroke:#333,stroke-width:2px,color:#fff
    style G fill:#f44336,stroke:#333,stroke-width:2px,color:#fff
    style J fill:#ff9800,stroke:#333,stroke-width:2px,color:#000
    style L fill:#4CAF50,stroke:#333,stroke-width:2px,color:#fff
```

## Authentication Module

### 1. Register Tenant
**POST** `/auth/register-tenant`

Register a new tenant organization with admin user.

**Request:**
```json
{
  "tenantName": "Acme Corporation",
  "subdomain": "acme",
  "adminEmail": "admin@acme.com",
  "adminPassword": "SecurePass@123",
  "adminFullName": "John Doe"
}
```

**Success (201):**
```json
{
  "success": true,
  "message": "Tenant registered successfully",
  "data": {
    "tenantId": "uuid",
    "subdomain": "acme",
    "adminUser": {
      "id": "uuid",
      "email": "admin@acme.com",
      "fullName": "John Doe",
      "role": "tenant_admin"
    }
  }
}
```

**Errors:**
- 400: Validation error
- 409: Subdomain or email already exists

**Registration Flow:**

```mermaid
sequenceDiagram
    participant C as Client
    participant A as API
    participant V as Validator
    participant DB as Database
    
    C->>A: POST /auth/register-tenant
    A->>V: Validate input
    V->>V: Check subdomain format
    V->>V: Validate email
    V->>V: Check password strength
    
    alt Validation fails
        V-->>C: 400 Bad Request
    else Validation passes
        V->>DB: Check subdomain uniqueness
        alt Subdomain exists
            DB-->>C: 409 Conflict
        else Subdomain available
            DB->>DB: BEGIN TRANSACTION
            DB->>DB: INSERT INTO tenants
            DB->>DB: Hash password
            DB->>DB: INSERT INTO users
            DB->>DB: COMMIT
            DB-->>C: 201 Created + tenant data
        end
    end
```

---

### 2. Login
**POST** `/auth/login`

Authenticate user and receive JWT token.

**Request:**
```json
{
  "email": "admin@demo.com",
  "password": "Demo@123",
  "tenantSubdomain": "demo"
}
```

**Success (200):**
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "admin@demo.com",
      "fullName": "Demo Admin",
      "role": "tenant_admin",
      "tenantId": "uuid"
    },
    "token": "eyJhbGciOiJI...",
    "expiresIn": 86400
  }
}
```

**Errors:**
- 401: Invalid credentials
- 404: Tenant not found
- 403: Account suspended

**Authentication Sequence:**

```mermaid
sequenceDiagram
    participant U as User
    participant C as Client App
    participant A as Auth API
    participant DB as Database
    
    U->>C: Enter credentials
    C->>A: POST /auth/login
    A->>DB: Find tenant by subdomain
    
    alt Tenant not found
        DB-->>C: 404 Not Found
    else Tenant found
        DB->>DB: Check tenant status
        alt Tenant suspended
            DB-->>C: 403 Forbidden
        else Tenant active
            DB->>DB: Find user by email + tenant_id
            alt User not found
                DB-->>C: 401 Unauthorized
            else User found
                DB->>A: Return user record
                A->>A: bcrypt.compare(password, hash)
                alt Password invalid
                    A-->>C: 401 Unauthorized
                else Password valid
                    A->>A: Generate JWT token
                    A-->>C: 200 OK + {token, user}
                    C->>C: Store token
                    C-->>U: Redirect to dashboard
                end
            end
        end
    end
```

---

### 3. Get Current User
**GET** `/auth/me`

**Headers:** `Authorization: Bearer {token}`

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "email": "admin@demo.com",
    "fullName": "Demo Admin",
    "role": "tenant_admin",
    "isActive": true,
    "tenant": {
      "id": "uuid",
      "name": "Demo Company",
      "subdomain": "demo",
      "subscriptionPlan": "pro",
      "maxUsers": 25,
      "maxProjects": 15
    }
  }
}
```

---

### 4. Logout
**POST** `/auth/logout`

**Headers:** `Authorization: Bearer {token}`

**Success (200):**
```json
{
  "success": true,
  "message": "Logged out successfully"
}
```

---

## Tenant Management Module

### 5. Get Tenant Details
**GET** `/tenants/:tenantId`

**Headers:** `Authorization: Bearer {token}`

**Authorization:** User must belong to tenant OR be super_admin

**Success (200):**
```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "name": "Demo Company",
    "subdomain": "demo",
    "status": "active",
    "subscriptionPlan": "pro",
    "maxUsers": 25,
    "maxProjects": 15,
    "createdAt": "2026-01-01T00:00:00Z",
    "stats": {
      "totalUsers": 5,
      "totalProjects": 3,
      "totalTasks": 15
    }
  }
}
```

---

### 6. Update Tenant
**PUT** `/tenants/:tenantId`

**Headers:** `Authorization: Bearer {token}`

**Authorization:** tenant_admin (name only) OR super_admin (all fields)

**Request:**
```json
{
  "name": "Updated Company Name",
  "status": "active",
  "subscriptionPlan": "enterprise",
  "maxUsers": 100,
  "maxProjects": 50
}
```

---

### 7. List All Tenants
**GET** `/tenants`

**Headers:** `Authorization: Bearer {token}`

**Authorization:** super_admin ONLY

**Query Parameters:**
- `page`: Page number (default: 1)
- `limit`: Items per page (default: 10)
- `status`: Filter by status
- `subscriptionPlan`: Filter by plan

**Success (200):**
```json
{
  "success": true,
  "data": {
    "tenants": [
      {
        "id": "uuid",
        "name": "Demo Company",
        "subdomain": "demo",
        "status": "active",
        "subscriptionPlan": "pro",
        "totalUsers": 5,
        "totalProjects": 3,
        "createdAt": "2026-01-01T00:00:00Z"
      }
    ],
    "pagination": {
      "currentPage": 1,
      "totalPages": 5,
      "totalTenants": 47,
      "limit": 10
    }
  }
}
```

---

## User Management Module

### 8. Add User
**POST** `/tenants/:tenantId/users`

**Headers:** `Authorization: Bearer {token}`

**Authorization:** tenant_admin only

**Request:**
```json
{
  "email": "newuser@demo.com",
  "password": "SecurePass@123",
  "fullName": "New User",
  "role": "user"
}
```

**Success (201):**
```json
{
  "success": true,
  "message": "User created successfully",
  "data": {
    "id": "uuid",
    "email": "newuser@demo.com",
    "fullName": "New User",
    "role": "user",
    "tenantId": "uuid",
    "isActive": true,
    "createdAt": "2026-01-02T00:00:00Z"
  }
}
```

**Errors:**
- 403: Subscription limit reached
- 409: Email already exists in tenant

---

### 9. List Users
**GET** `/tenants/:tenantId/users`

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `search`: Search by name or email
- `role`: Filter by role
- `page`: Page number
- `limit`: Items per page

---

### 10. Update User
**PUT** `/users/:userId`

**Headers:** `Authorization: Bearer {token}`

**Authorization:** tenant_admin OR self (limited fields)

**Request:**
```json
{
  "fullName": "Updated Name",
  "role": "tenant_admin",
  "isActive": true
}
```

---

### 11. Delete User
**DELETE** `/users/:userId`

**Headers:** `Authorization: Bearer {token}`

**Authorization:** tenant_admin only

**Success (200):**
```json
{
  "success": true,
  "message": "User deleted successfully"
}
```

**Errors:**
- 403: Cannot delete self

---

## Project Management Module

### 12. Create Project
**POST** `/projects`

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "name": "Website Redesign",
  "description": "Complete redesign of company website",
  "status": "active"
}
```

**Errors:**
- 403: Project limit reached

---

### 13. List Projects
**GET** `/projects`

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `status`: Filter by status
- `search`: Search by name
- `page`: Page number
- `limit`: Items per page

---

### 14. Update Project
**PUT** `/projects/:projectId`

**Headers:** `Authorization: Bearer {token}`

**Authorization:** tenant_admin OR project creator

**Request:**
```json
{
  "name": "Updated Project Name",
  "description": "Updated description",
  "status": "completed"
}
```

---

### 15. Delete Project
**DELETE** `/projects/:projectId`

**Headers:** `Authorization: Bearer {token}`

**Authorization:** tenant_admin OR project creator

---

## Task Management Module

### 16. Create Task
**POST** `/projects/:projectId/tasks`

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "title": "Design homepage mockup",
  "description": "Create high-fidelity design",
  "assignedTo": "user-uuid",
  "priority": "high",
  "dueDate": "2026-07-15"
}
```

---

### 17. List Tasks
**GET** `/projects/:projectId/tasks`

**Headers:** `Authorization: Bearer {token}`

**Query Parameters:**
- `status`: Filter by status
- `assignedTo`: Filter by assigned user
- `priority`: Filter by priority
- `search`: Search by title

---

### 18. Update Task Status
**PATCH** `/tasks/:taskId/status`

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "status": "completed"
}
```

---

### 19. Update Task
**PUT** `/tasks/:taskId`

**Headers:** `Authorization: Bearer {token}`

**Request:**
```json
{
  "title": "Updated task title",
  "description": "Updated description",
  "status": "in_progress",
  "priority": "high",
  "assignedTo": "user-uuid",
  "dueDate": "2026-08-01"
}
```

---

## Health Check

### 20. Health Check
**GET** `/health`

**Success (200):**
```json
{
  "status": "ok",
  "database": "connected",
  "timestamp": "2026-01-02T00:00:00Z"
}
```

---

## HTTP Status Codes

- **200 OK**: Successful GET/PUT/PATCH/DELETE
- **201 Created**: Successful POST
- **400 Bad Request**: Invalid input
- **401 Unauthorized**: Missing/invalid token
- **403 Forbidden**: Insufficient permissions
- **404 Not Found**: Resource not found
- **409 Conflict**: Duplicate resource
- **500 Internal Server Error**: Server error

---

## Role-Based Access Control (RBAC)

```mermaid
flowchart TD
    A[API Request] --> B{JWT Token<br/>Present?}
    B -->|No| C[401 Unauthorized]
    B -->|Yes| D[Decode Token]
    D --> E[Extract Role]
    E --> F{Endpoint<br/>Access Rules}
    
    F -->|Public| G[Allow Access]
    F -->|Requires Auth| H{Check Role}
    
    H -->|super_admin| I[Full Access]
    H -->|tenant_admin| J{Tenant<br/>Match?}
    H -->|user| K{Resource<br/>Owner?}
    
    J -->|Yes| L[Admin Actions Allowed]
    J -->|No| M[403 Forbidden]
    
    K -->|Yes| N[User Actions Allowed]
    K -->|No| M
    
    I --> O[Execute Request]
    L --> O
    N --> O
    G --> O
    
    O --> P[Return Response]
    
    style A fill:#4ecdc4,stroke:#333,stroke-width:2px
    style C fill:#f44336,stroke:#333,stroke-width:2px,color:#fff
    style M fill:#ff9800,stroke:#333,stroke-width:2px,color:#000
    style P fill:#4CAF50,stroke:#333,stroke-width:2px,color:#fff
    style I fill:#ff6b6b,stroke:#333,stroke-width:2px,color:#fff
    style L fill:#4ecdc4,stroke:#333,stroke-width:2px
    style N fill:#95e1d3,stroke:#333,stroke-width:2px
```
