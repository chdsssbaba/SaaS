import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import {
  User,
  Tenant,
  authApi,
  getToken,
  setToken,
  removeToken,
  getStoredUser,
  setStoredUser,
  removeStoredUser,
} from '@/lib/api';
import { useToast } from '@/hooks/use-toast';

interface AuthContextType {
  user: User | null;
  tenant: Tenant | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string, tenantSubdomain: string) => Promise<void>;
  register: (data: {
    tenantName: string;
    subdomain: string;
    adminEmail: string;
    adminPassword: string;
    adminFullName: string;
  }) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [tenant, setTenant] = useState<Tenant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  const isAuthenticated = !!user && !!getToken();

  // Check auth status on mount
  useEffect(() => {
    const initAuth = async () => {
      const token = getToken();
      const storedUser = getStoredUser();

      if (token && storedUser) {
        try {
          const response = await authApi.getMe();
          if (response.success && response.data) {
            setUser(response.data);
            if (response.data.tenant) {
              setTenant(response.data.tenant);
            }
          }
        } catch (error) {
          console.error('Auth check failed:', error);
          removeToken();
          removeStoredUser();
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string, tenantSubdomain: string) => {
    try {
      const response = await authApi.login({ email, password, tenantSubdomain });
      
      if (response.success && response.data) {
        setToken(response.data.token);
        setStoredUser(response.data.user);
        setUser(response.data.user);
        
        // Fetch full user data with tenant info
        const meResponse = await authApi.getMe();
        if (meResponse.success && meResponse.data) {
          setUser(meResponse.data);
          if (meResponse.data.tenant) {
            setTenant(meResponse.data.tenant);
          }
        }

        toast({
          title: "Welcome back!",
          description: `Logged in as ${response.data.user.fullName}`,
        });
      }
    } catch (error: any) {
      toast({
        title: "Login failed",
        description: error.message || "Invalid credentials",
        variant: "destructive",
      });
      throw error;
    }
  };

  const register = async (data: {
    tenantName: string;
    subdomain: string;
    adminEmail: string;
    adminPassword: string;
    adminFullName: string;
  }) => {
    try {
      const response = await authApi.registerTenant(data);
      
      if (response.success) {
        toast({
          title: "Registration successful!",
          description: "Your organization has been created. Please login.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Registration failed",
        description: error.message || "Could not create organization",
        variant: "destructive",
      });
      throw error;
    }
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      removeToken();
      removeStoredUser();
      setUser(null);
      setTenant(null);
      toast({
        title: "Logged out",
        description: "You have been successfully logged out.",
      });
    }
  };

  const refreshUser = async () => {
    try {
      const response = await authApi.getMe();
      if (response.success && response.data) {
        setUser(response.data);
        setStoredUser(response.data);
        if (response.data.tenant) {
          setTenant(response.data.tenant);
        }
      }
    } catch (error) {
      console.error('Failed to refresh user:', error);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        tenant,
        isLoading,
        isAuthenticated,
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};
