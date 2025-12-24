import React from 'react';

interface AuthLayoutProps {
  children: React.ReactNode;
}

const AuthLayout: React.FC<AuthLayoutProps> = ({ children }) => {
  return (
    <div className="min-h-screen relative overflow-hidden bg-background flex items-center justify-center p-4">
      {/* Animated background orbs */}
      <div className="orb orb-purple w-[500px] h-[500px] -top-48 -left-48 animate-float" />
      <div className="orb orb-orange w-[400px] h-[400px] -bottom-32 -right-32 animate-float-delayed" />
      <div className="orb orb-purple w-[150px] h-[150px] top-1/4 right-1/4 animate-pulse-slow opacity-40" />
      <div className="orb orb-orange w-[80px] h-[80px] bottom-1/3 left-1/4 animate-float opacity-50" />
      
      {/* Content */}
      <div className="relative z-10 w-full max-w-md animate-scale-in">
        {children}
      </div>
    </div>
  );
};

export default AuthLayout;
