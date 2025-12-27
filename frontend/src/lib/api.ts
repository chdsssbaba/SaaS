// API Configuration and Service Layer
// Backend runs on port 5000

const API_BASE_URL = 'http://localhost:5000/api';

// Types
export interface User {
  id: string;
  email: string;
  fullName: string;
  role: 'super_admin' | 'tenant_admin' | 'user';
  isActive: boolean;
  tenantId: string | null;
  createdAt: string;
  updatedAt?: string;
  tenant?: {
    name: string;
    subdomain: string;
  };
}

export interface Tenant {
  id: string;
  name: string;
  subdomain: string;
  status: 'active' | 'suspended' | 'trial';
  subscriptionPlan: 'free' | 'pro' | 'enterprise';
  maxUsers: number;
  maxProjects: number;
  createdAt: string;
  updatedAt?: string;
  stats?: {
    totalUsers: number;
    totalProjects: number;
    totalTasks: number;
  };
}

export interface Project {
  id: string;
  tenantId: string;
  name: string;
  description?: string;
  status: 'active' | 'archived' | 'completed';
  createdBy: string | { id: string; fullName: string };
  createdAt: string;
  updatedAt?: string;
  taskCount?: number;
  completedTaskCount?: number;
}

export interface Task {
  id: string;
  projectId: string;
  tenantId: string;
  title: string;
  description?: string;
  status: 'todo' | 'in_progress' | 'completed';
  priority: 'low' | 'medium' | 'high';
  assignedTo?: string | { id: string; fullName: string; email: string } | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  expiresIn: number;
}

export interface ApiResponse<T> {
  success: boolean;
  message?: string;
  data?: T;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  pagination: {
    currentPage: number;
    totalPages: number;
    limit: number;
  };
}

// Token management
export const getToken = (): string | null => {
  return localStorage.getItem('token');
};

export const setToken = (token: string): void => {
  localStorage.setItem('token', token);
};

export const removeToken = (): void => {
  localStorage.removeItem('token');
};

export const getStoredUser = (): User | null => {
  const user = localStorage.getItem('user');
  return user ? JSON.parse(user) : null;
};

export const setStoredUser = (user: User): void => {
  localStorage.setItem('user', JSON.stringify(user));
};

export const removeStoredUser = (): void => {
  localStorage.removeItem('user');
};

// API Client
const apiClient = async <T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<ApiResponse<T>> => {
  const token = getToken();

  const headers: HeadersInit = {
    'Content-Type': 'application/json',
    ...(token && { Authorization: `Bearer ${token}` }),
    ...options.headers,
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.message || 'An error occurred');
  }

  return data;
};

// Auth API
export const authApi = {
  registerTenant: async (payload: {
    tenantName: string;
    subdomain: string;
    adminEmail: string;
    adminPassword: string;
    adminFullName: string;
  }) => {
    return apiClient<{
      tenantId: string;
      subdomain: string;
      adminUser: User;
    }>('/auth/register-tenant', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  login: async (payload: {
    email: string;
    password: string;
    tenantSubdomain: string;
  }) => {
    return apiClient<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  getMe: async () => {
    return apiClient<User & { tenant?: Tenant }>('/auth/me');
  },

  logout: async () => {
    return apiClient<void>('/auth/logout', {
      method: 'POST',
    });
  },
};

// Tenants API
export const tenantsApi = {
  getAll: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    subscriptionPlan?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.status) queryParams.append('status', params.status);
    if (params?.subscriptionPlan) queryParams.append('subscriptionPlan', params.subscriptionPlan);

    return apiClient<{
      tenants: Tenant[];
      pagination: { currentPage: number; totalPages: number; totalTenants: number; limit: number };
    }>(`/tenants?${queryParams.toString()}`);
  },

  getById: async (tenantId: string) => {
    return apiClient<Tenant>(`/tenants/${tenantId}`);
  },

  update: async (tenantId: string, payload: Partial<Tenant>) => {
    return apiClient<Tenant>(`/tenants/${tenantId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },
};

// Users API
export const usersApi = {
  getAll: async (params?: {
    search?: string;
    role?: string;
    tenantId?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.tenantId) queryParams.append('tenantId', params.tenantId);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return apiClient<{
      users: User[];
      total: number;
      pagination: { currentPage: number; totalPages: number; limit: number };
    }>(`/users?${queryParams.toString()}`);
  },

  getByTenant: async (tenantId: string, params?: {
    search?: string;
    role?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.role) queryParams.append('role', params.role);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return apiClient<{
      users: User[];
      total: number;
      pagination: { currentPage: number; totalPages: number; limit: number };
    }>(`/tenants/${tenantId}/users?${queryParams.toString()}`);
  },

  create: async (tenantId: string, payload: {
    email: string;
    password: string;
    fullName: string;
    role?: 'user' | 'tenant_admin';
  }) => {
    return apiClient<User>(`/tenants/${tenantId}/users`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update: async (userId: string, payload: {
    fullName?: string;
    role?: string;
    isActive?: boolean;
  }) => {
    return apiClient<User>(`/users/${userId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  delete: async (userId: string) => {
    return apiClient<void>(`/users/${userId}`, {
      method: 'DELETE',
    });
  },
};

// Projects API
export const projectsApi = {
  getAll: async (params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return apiClient<{
      projects: Project[];
      total: number;
      pagination: { currentPage: number; totalPages: number; limit: number };
    }>(`/projects?${queryParams.toString()}`);
  },

  getById: async (projectId: string) => {
    return apiClient<Project>(`/projects/${projectId}`);
  },

  create: async (payload: {
    name: string;
    description?: string;
    status?: 'active' | 'archived' | 'completed';
  }) => {
    return apiClient<Project>('/projects', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update: async (projectId: string, payload: Partial<Project>) => {
    return apiClient<Project>(`/projects/${projectId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  delete: async (projectId: string) => {
    return apiClient<void>(`/projects/${projectId}`, {
      method: 'DELETE',
    });
  },
};

// Tasks API
export const tasksApi = {
  getByProject: async (projectId: string, params?: {
    status?: string;
    assignedTo?: string;
    priority?: string;
    search?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.assignedTo) queryParams.append('assignedTo', params.assignedTo);
    if (params?.priority) queryParams.append('priority', params.priority);
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    return apiClient<{
      tasks: Task[];
      total: number;
      pagination: { currentPage: number; totalPages: number; limit: number };
    }>(`/projects/${projectId}/tasks?${queryParams.toString()}`);
  },

  create: async (projectId: string, payload: {
    title: string;
    description?: string;
    assignedTo?: string;
    priority?: 'low' | 'medium' | 'high';
    dueDate?: string;
  }) => {
    return apiClient<Task>(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(payload),
    });
  },

  update: async (taskId: string, payload: Partial<Task>) => {
    return apiClient<Task>(`/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  updateStatus: async (taskId: string, status: Task['status']) => {
    return apiClient<Task>(`/tasks/${taskId}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    });
  },

  delete: async (taskId: string) => {
    return apiClient<void>(`/tasks/${taskId}`, {
      method: 'DELETE',
    });
  },
};
