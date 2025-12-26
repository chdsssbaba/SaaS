import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import StatCard from '@/components/StatCard';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { projectsApi, tasksApi, Project, Task } from '@/lib/api';
import {
  FolderKanban,
  CheckCircle2,
  Clock,
  ListTodo,
  Plus,
  ArrowRight,
  Calendar,
  User,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const DashboardPage: React.FC = () => {
  const { user, tenant } = useAuth();
  const { toast } = useToast();
  const [projects, setProjects] = useState<Project[]>([]);
  const [myTasks, setMyTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [stats, setStats] = useState({
    totalProjects: 0,
    totalTasks: 0,
    completedTasks: 0,
    pendingTasks: 0,
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        // Fetch projects
        const projectsRes = await projectsApi.getAll({ limit: 5 });
        if (projectsRes.success && projectsRes.data) {
          setProjects(projectsRes.data.projects);
          setStats(prev => ({
            ...prev,
            totalProjects: projectsRes.data!.total,
          }));

          // Fetch tasks for each project to calculate stats
          let allTasks: Task[] = [];
          for (const project of projectsRes.data.projects.slice(0, 3)) {
            const tasksRes = await tasksApi.getByProject(project.id);
            if (tasksRes.success && tasksRes.data) {
              allTasks = [...allTasks, ...tasksRes.data.tasks];
            }
          }

          // Filter tasks assigned to current user
          const userTasks = allTasks.filter(
            (task) => {
              const assignedTo = task.assignedTo;
              if (typeof assignedTo === 'object' && assignedTo !== null) {
                return assignedTo.id === user?.id;
              }
              return assignedTo === user?.id;
            }
          );
          setMyTasks(userTasks.slice(0, 5));

          // Calculate stats
          const completed = allTasks.filter(t => t.status === 'completed').length;
          setStats(prev => ({
            ...prev,
            totalTasks: allTasks.length,
            completedTasks: completed,
            pendingTasks: allTasks.length - completed,
          }));
        }

        toast({
          title: "Dashboard loaded",
          description: "Your dashboard data is ready",
        });
      } catch (error: any) {
        console.error('Failed to fetch dashboard data:', error);
        toast({
          title: "Error loading dashboard",
          description: error.message || "Could not load dashboard data",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [user?.id]);

  const getStatusBadgeClass = (status: string) => {
    switch (status) {
      case 'completed':
        return 'badge-completed';
      case 'in_progress':
        return 'badge-in-progress';
      case 'active':
        return 'badge-active';
      case 'archived':
        return 'badge-archived';
      default:
        return 'badge-todo';
    }
  };

  const getPriorityBadgeClass = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'priority-high';
      case 'medium':
        return 'priority-medium';
      default:
        return 'priority-low';
    }
  };

  const getPlanBadgeClass = (plan?: string) => {
    switch (plan) {
      case 'enterprise':
        return 'plan-enterprise';
      case 'pro':
        return 'plan-pro';
      default:
        return 'plan-free';
    }
  };

  if (isLoading) {
    return (
      <DashboardLayout title="Dashboard">
        <div className="flex items-center justify-center h-[60vh]">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading dashboard...</p>
          </div>
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout
      title={`Welcome back, ${user?.fullName?.split(' ')[0] || 'User'}!`}
      subtitle={tenant?.name || 'Your organization'}
      actions={
        <Link to="/projects">
          <Button className="gradient-button">
            <Plus className="h-4 w-4 mr-2" />
            New Project
          </Button>
        </Link>
      }
    >
      <div className="space-y-8">
        {/* Tenant Info Banner */}
        {tenant && (
          <div className="glass-card p-4 flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                <FolderKanban className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-foreground">{tenant.name}</h3>
                <p className="text-sm text-muted-foreground">{tenant.subdomain}.yourapp.com</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className={cn('px-3 py-1 rounded-full text-xs font-medium', getPlanBadgeClass(tenant.subscriptionPlan))}>
                {tenant.subscriptionPlan?.toUpperCase()} Plan
              </span>
              <div className="text-right text-sm">
                <p className="text-muted-foreground">
                  {stats.totalProjects} / {tenant.maxProjects} projects
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Projects"
            value={stats.totalProjects}
            icon={FolderKanban}
            variant="primary"
          />
          <StatCard
            title="Total Tasks"
            value={stats.totalTasks}
            icon={ListTodo}
            variant="secondary"
          />
          <StatCard
            title="Completed Tasks"
            value={stats.completedTasks}
            icon={CheckCircle2}
            variant="success"
          />
          <StatCard
            title="Pending Tasks"
            value={stats.pendingTasks}
            icon={Clock}
            variant="warning"
          />
        </div>

        {/* Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Projects */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">Recent Projects</h2>
              <Link to="/projects" className="text-primary text-sm hover:underline flex items-center gap-1">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="space-y-3">
              {projects.length === 0 ? (
                <div className="text-center py-8">
                  <FolderKanban className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No projects yet</p>
                  <Link to="/projects">
                    <Button variant="outline" size="sm" className="mt-4">
                      Create your first project
                    </Button>
                  </Link>
                </div>
              ) : (
                projects.map((project) => (
                  <Link
                    key={project.id}
                    to={`/projects/${project.id}`}
                    className="block p-4 rounded-xl bg-muted/30 hover:bg-muted/50 border border-border/30 hover:border-primary/30 transition-all duration-200"
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{project.name}</h3>
                        <p className="text-sm text-muted-foreground truncate mt-1">
                          {project.description || 'No description'}
                        </p>
                      </div>
                      <div className="flex items-center gap-3 ml-4">
                        <span className={cn('px-2 py-1 rounded-lg text-xs', getStatusBadgeClass(project.status))}>
                          {project.status}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {project.taskCount || 0} tasks
                        </span>
                      </div>
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>

          {/* My Tasks */}
          <div className="glass-card p-6">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-foreground">My Tasks</h2>
              <span className="text-sm text-muted-foreground">{myTasks.length} assigned</span>
            </div>
            <div className="space-y-3">
              {myTasks.length === 0 ? (
                <div className="text-center py-8">
                  <ListTodo className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
                  <p className="text-muted-foreground">No tasks assigned to you</p>
                </div>
              ) : (
                myTasks.map((task) => (
                  <div
                    key={task.id}
                    className="p-4 rounded-xl bg-muted/30 border border-border/30 hover:border-primary/30 transition-all duration-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="font-medium text-foreground">{task.title}</h3>
                        <div className="flex items-center gap-3 mt-2">
                          <span className={cn('px-2 py-0.5 rounded-lg text-xs', getStatusBadgeClass(task.status))}>
                            {task.status.replace('_', ' ')}
                          </span>
                          <span className={cn('px-2 py-0.5 rounded-lg text-xs', getPriorityBadgeClass(task.priority))}>
                            {task.priority}
                          </span>
                        </div>
                      </div>
                      {task.dueDate && (
                        <div className="flex items-center gap-1 text-xs text-muted-foreground">
                          <Calendar className="h-3 w-3" />
                          {new Date(task.dueDate).toLocaleDateString()}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default DashboardPage;
