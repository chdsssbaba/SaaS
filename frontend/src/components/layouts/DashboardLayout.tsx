import React from 'react';
import { SidebarProvider, SidebarTrigger, SidebarInset } from '@/components/ui/sidebar';
import AppSidebar from '@/components/AppSidebar';
import { Menu } from 'lucide-react';

interface DashboardLayoutProps {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

const DashboardLayout: React.FC<DashboardLayoutProps> = ({
  children,
  title,
  subtitle,
  actions,
}) => {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        <AppSidebar />
        <SidebarInset className="flex-1">
          {/* Top bar */}
          <header className="h-16 border-b border-border/30 flex items-center justify-between px-6 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="h-9 w-9 rounded-xl border border-border/30 hover:bg-muted/50 transition-colors flex items-center justify-center">
                <Menu className="h-4 w-4" />
              </SidebarTrigger>
              {title && (
                <div>
                  <h1 className="text-xl font-bold text-foreground">{title}</h1>
                  {subtitle && (
                    <p className="text-sm text-muted-foreground">{subtitle}</p>
                  )}
                </div>
              )}
            </div>
            {actions && <div className="flex items-center gap-3">{actions}</div>}
          </header>

          {/* Main content */}
          <main className="flex-1 p-6">
            <div className="relative">
              {/* Subtle background effects */}
              <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="orb orb-purple w-[400px] h-[400px] -top-48 -right-48 opacity-20" />
                <div className="orb orb-orange w-[300px] h-[300px] -bottom-32 -left-32 opacity-15" />
              </div>
              
              {/* Content */}
              <div className="relative z-10">
                {children}
              </div>
            </div>
          </main>
        </SidebarInset>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayout;
