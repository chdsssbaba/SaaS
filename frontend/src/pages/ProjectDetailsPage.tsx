import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { projectsApi, tasksApi, usersApi, Project, Task, User } from '@/lib/api';
import { Plus, FolderKanban, Loader2, Calendar, User as UserIcon, MoreVertical, Edit, Trash2, ArrowLeft, Clock, CheckCircle2, AlertCircle, ListTodo, ChevronDown } from 'lucide-react';
import { cn } from '@/lib/utils';

const ProjectDetailsPage: React.FC = () => {
  const { projectId } = useParams<{ projectId: string }>();
  const navigate = useNavigate();
  const { tenant } = useAuth();
  const { toast } = useToast();
  const [project, setProject] = useState<Project | null>(null);
  const [tasks, setTasks] = useState<Task[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');
  const [isCreateTaskModalOpen, setIsCreateTaskModalOpen] = useState(false);
  const [isEditTaskModalOpen, setIsEditTaskModalOpen] = useState(false);
  const [isDeleteTaskDialogOpen, setIsDeleteTaskDialogOpen] = useState(false);
  const [selectedTask, setSelectedTask] = useState<Task | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [taskFormData, setTaskFormData] = useState({ title: '', description: '', status: 'todo' as Task['status'], priority: 'medium' as Task['priority'], assignedTo: '', dueDate: '' });

  const fetchProjectData = async () => {
    if (!projectId) return;
    try {
      const projectRes = await projectsApi.getById(projectId);
      if (projectRes.success && projectRes.data) setProject(projectRes.data);
      const params: any = {};
      if (statusFilter !== 'all') params.status = statusFilter;
      if (priorityFilter !== 'all') params.priority = priorityFilter;
      const tasksRes = await tasksApi.getByProject(projectId, params);
      if (tasksRes.success && tasksRes.data) setTasks(tasksRes.data.tasks);
      if (tenant?.id) {
        const usersRes = await usersApi.getByTenant(tenant.id);
        if (usersRes.success && usersRes.data) setUsers(usersRes.data.users);
      }
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    finally { setIsLoading(false); }
  };

  useEffect(() => { fetchProjectData(); }, [projectId, statusFilter, priorityFilter, tenant?.id]);

  const handleCreateTask = async () => {
    if (!projectId || !taskFormData.title.trim()) { toast({ title: "Error", description: "Title required", variant: "destructive" }); return; }
    setIsSubmitting(true);
    try {
      const response = await tasksApi.create(projectId, { title: taskFormData.title, description: taskFormData.description || undefined, priority: taskFormData.priority, assignedTo: taskFormData.assignedTo || undefined, dueDate: taskFormData.dueDate || undefined });
      if (response.success && response.data) { setTasks([response.data, ...tasks]); setIsCreateTaskModalOpen(false); setTaskFormData({ title: '', description: '', status: 'todo', priority: 'medium', assignedTo: '', dueDate: '' }); toast({ title: "Task created" }); }
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    finally { setIsSubmitting(false); }
  };

  const handleEditTask = async () => {
    if (!selectedTask) return;
    setIsSubmitting(true);
    try {
      const payload: any = { title: taskFormData.title, description: taskFormData.description || undefined, status: taskFormData.status, priority: taskFormData.priority, dueDate: taskFormData.dueDate || null, assignedTo: taskFormData.assignedTo || null };
      const response = await tasksApi.update(selectedTask.id, payload);
      if (response.success && response.data) { setTasks(tasks.map(t => t.id === selectedTask.id ? response.data! : t)); setIsEditTaskModalOpen(false); toast({ title: "Task updated" }); }
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    finally { setIsSubmitting(false); }
  };

  const handleStatusChange = async (task: Task, newStatus: Task['status']) => {
    try {
      const response = await tasksApi.updateStatus(task.id, newStatus);
      if (response.success) { setTasks(tasks.map(t => t.id === task.id ? { ...t, status: newStatus } : t)); toast({ title: "Status updated" }); }
    } catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
  };

  const handleDeleteTask = async () => {
    if (!selectedTask) return;
    setIsSubmitting(true);
    try { await tasksApi.delete(selectedTask.id); setTasks(tasks.filter(t => t.id !== selectedTask.id)); setIsDeleteTaskDialogOpen(false); toast({ title: "Task deleted" }); }
    catch (error: any) { toast({ title: "Error", description: error.message, variant: "destructive" }); }
    finally { setIsSubmitting(false); }
  };

  const openEditTaskModal = (task: Task) => {
    setSelectedTask(task);
    const assignedToId = typeof task.assignedTo === 'object' && task.assignedTo !== null ? task.assignedTo.id : (task.assignedTo as string) || '';
    setTaskFormData({ title: task.title, description: task.description || '', status: task.status, priority: task.priority, assignedTo: assignedToId, dueDate: task.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '' });
    setIsEditTaskModalOpen(true);
  };

  const getStatusIcon = (status: string) => status === 'completed' ? <CheckCircle2 className="h-4 w-4 text-emerald-500" /> : status === 'in_progress' ? <Clock className="h-4 w-4 text-blue-500" /> : <ListTodo className="h-4 w-4 text-slate-500" />;
  const getStatusBadgeClass = (status: string) => status === 'completed' ? 'badge-completed' : status === 'in_progress' ? 'badge-in-progress' : 'badge-todo';
  const getPriorityBadgeClass = (priority: string) => priority === 'high' ? 'priority-high' : priority === 'medium' ? 'priority-medium' : 'priority-low';
  const getAssigneeName = (a: Task['assignedTo']) => !a ? 'Unassigned' : typeof a === 'object' ? a.fullName : users.find(u => u.id === a)?.fullName || 'Unknown';

  const tasksByStatus = { todo: tasks.filter(t => t.status === 'todo'), in_progress: tasks.filter(t => t.status === 'in_progress'), completed: tasks.filter(t => t.status === 'completed') };

  if (isLoading) return <DashboardLayout><div className="flex items-center justify-center h-[60vh]"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div></DashboardLayout>;
  if (!project) return <DashboardLayout><div className="glass-card p-12 text-center"><AlertCircle className="h-16 w-16 mx-auto text-destructive/50 mb-4" /><h3 className="text-xl font-semibold mb-2">Project not found</h3><Button variant="outline" onClick={() => navigate('/projects')}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button></div></DashboardLayout>;

  return (
    <DashboardLayout title={project.name} subtitle={project.description || ''} actions={<div className="flex items-center gap-3"><Button variant="outline" onClick={() => navigate('/projects')}><ArrowLeft className="h-4 w-4 mr-2" />Back</Button><Button className="gradient-button" onClick={() => setIsCreateTaskModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Task</Button></div>}>
      <div className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="glass-card p-4 flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-slate-500/20 flex items-center justify-center"><ListTodo className="h-6 w-6 text-slate-400" /></div><div><p className="text-2xl font-bold">{tasksByStatus.todo.length}</p><p className="text-sm text-muted-foreground">To Do</p></div></div>
          <div className="glass-card p-4 flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-blue-500/20 flex items-center justify-center"><Clock className="h-6 w-6 text-blue-400" /></div><div><p className="text-2xl font-bold">{tasksByStatus.in_progress.length}</p><p className="text-sm text-muted-foreground">In Progress</p></div></div>
          <div className="glass-card p-4 flex items-center gap-4"><div className="h-12 w-12 rounded-xl bg-emerald-500/20 flex items-center justify-center"><CheckCircle2 className="h-6 w-6 text-emerald-400" /></div><div><p className="text-2xl font-bold">{tasksByStatus.completed.length}</p><p className="text-sm text-muted-foreground">Completed</p></div></div>
        </div>

        <div className="glass-card p-4 flex flex-col sm:flex-row gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}><SelectTrigger className="w-full sm:w-48 h-12 glass-input"><SelectValue placeholder="Status" /></SelectTrigger><SelectContent className="glass-card border-border/30"><SelectItem value="all">All Status</SelectItem><SelectItem value="todo">To Do</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select>
          <Select value={priorityFilter} onValueChange={setPriorityFilter}><SelectTrigger className="w-full sm:w-48 h-12 glass-input"><SelectValue placeholder="Priority" /></SelectTrigger><SelectContent className="glass-card border-border/30"><SelectItem value="all">All Priority</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="low">Low</SelectItem></SelectContent></Select>
        </div>

        {tasks.length === 0 ? <div className="glass-card p-12 text-center"><ListTodo className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" /><h3 className="text-xl font-semibold mb-2">No tasks yet</h3><Button className="gradient-button" onClick={() => setIsCreateTaskModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add Task</Button></div> : (
          <div className="space-y-3">
            {tasks.map((task) => (
              <div key={task.id} className="glass-card-hover p-4 group">
                <div className="flex items-start gap-4">
                  <div className="pt-1">{getStatusIcon(task.status)}</div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-medium">{task.title}</h4>
                    {task.description && <p className="text-sm text-muted-foreground mt-1 line-clamp-1">{task.description}</p>}
                    <div className="flex flex-wrap items-center gap-3 mt-3">
                      <span className={cn('px-2 py-0.5 rounded-lg text-xs', getStatusBadgeClass(task.status))}>{task.status.replace('_', ' ')}</span>
                      <span className={cn('px-2 py-0.5 rounded-lg text-xs', getPriorityBadgeClass(task.priority))}>{task.priority}</span>
                      <span className="flex items-center gap-1 text-xs text-muted-foreground"><UserIcon className="h-3 w-3" />{getAssigneeName(task.assignedTo)}</span>
                      {task.dueDate && <span className="flex items-center gap-1 text-xs text-muted-foreground"><Calendar className="h-3 w-3" />{new Date(task.dueDate).toLocaleDateString()}</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="outline" size="sm" className="h-8">Status <ChevronDown className="h-3 w-3 ml-1" /></Button></DropdownMenuTrigger><DropdownMenuContent className="glass-card border-border/30"><DropdownMenuItem onClick={() => handleStatusChange(task, 'todo')}><ListTodo className="h-4 w-4 mr-2 text-slate-500" />To Do</DropdownMenuItem><DropdownMenuItem onClick={() => handleStatusChange(task, 'in_progress')}><Clock className="h-4 w-4 mr-2 text-blue-500" />In Progress</DropdownMenuItem><DropdownMenuItem onClick={() => handleStatusChange(task, 'completed')}><CheckCircle2 className="h-4 w-4 mr-2 text-emerald-500" />Completed</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                    <DropdownMenu><DropdownMenuTrigger asChild><Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreVertical className="h-4 w-4" /></Button></DropdownMenuTrigger><DropdownMenuContent className="glass-card border-border/30" align="end"><DropdownMenuItem onClick={() => openEditTaskModal(task)}><Edit className="h-4 w-4 mr-2" />Edit</DropdownMenuItem><DropdownMenuSeparator className="bg-border/30" /><DropdownMenuItem className="text-destructive" onClick={() => { setSelectedTask(task); setIsDeleteTaskDialogOpen(true); }}><Trash2 className="h-4 w-4 mr-2" />Delete</DropdownMenuItem></DropdownMenuContent></DropdownMenu>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isCreateTaskModalOpen} onOpenChange={setIsCreateTaskModalOpen}>
        <DialogContent className="glass-card border-border/30 sm:max-w-md"><DialogHeader><DialogTitle>Create Task</DialogTitle><DialogDescription>Add a new task</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <input type="text" placeholder="Title *" value={taskFormData.title} onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })} className="glass-input" />
            <textarea placeholder="Description" value={taskFormData.description} onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })} className="glass-input min-h-[80px]" />
            <div className="grid grid-cols-2 gap-4">
              <Select value={taskFormData.priority} onValueChange={(v) => setTaskFormData({ ...taskFormData, priority: v as any })}><SelectTrigger className="glass-input"><SelectValue /></SelectTrigger><SelectContent className="glass-card border-border/30"><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select>
              <input type="date" value={taskFormData.dueDate} onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })} className="glass-input" />
            </div>
            <Select value={taskFormData.assignedTo || 'unassigned'} onValueChange={(v) => setTaskFormData({ ...taskFormData, assignedTo: v === 'unassigned' ? '' : v })}><SelectTrigger className="glass-input"><SelectValue placeholder="Assign to" /></SelectTrigger><SelectContent className="glass-card border-border/30"><SelectItem value="unassigned">Un assigned</SelectItem>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}</SelectContent></Select>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsCreateTaskModalOpen(false)}>Cancel</Button><Button className="gradient-button" onClick={handleCreateTask} disabled={isSubmitting}>{isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Create</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditTaskModalOpen} onOpenChange={setIsEditTaskModalOpen}>
        <DialogContent className="glass-card border-border/30 sm:max-w-md"><DialogHeader><DialogTitle>Edit Task</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <input type="text" placeholder="Title *" value={taskFormData.title} onChange={(e) => setTaskFormData({ ...taskFormData, title: e.target.value })} className="glass-input" />
            <textarea placeholder="Description" value={taskFormData.description} onChange={(e) => setTaskFormData({ ...taskFormData, description: e.target.value })} className="glass-input min-h-[80px]" />
            <div className="grid grid-cols-2 gap-4">
              <Select value={taskFormData.status} onValueChange={(v) => setTaskFormData({ ...taskFormData, status: v as any })}><SelectTrigger className="glass-input"><SelectValue /></SelectTrigger><SelectContent className="glass-card border-border/30"><SelectItem value="todo">To Do</SelectItem><SelectItem value="in_progress">In Progress</SelectItem><SelectItem value="completed">Completed</SelectItem></SelectContent></Select>
              <Select value={taskFormData.priority} onValueChange={(v) => setTaskFormData({ ...taskFormData, priority: v as any })}><SelectTrigger className="glass-input"><SelectValue /></SelectTrigger><SelectContent className="glass-card border-border/30"><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem></SelectContent></Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <input type="date" value={taskFormData.dueDate} onChange={(e) => setTaskFormData({ ...taskFormData, dueDate: e.target.value })} className="glass-input" />
              <Select value={taskFormData.assignedTo || 'unassigned'} onValueChange={(v) => setTaskFormData({ ...taskFormData, assignedTo: v === 'unassigned' ? '' : v })}><SelectTrigger className="glass-input"><SelectValue placeholder="Assign" /></SelectTrigger><SelectContent className="glass-card border-border/30"><SelectItem value="unassigned">Unassigned</SelectItem>{users.map(u => <SelectItem key={u.id} value={u.id}>{u.fullName}</SelectItem>)}</SelectContent></Select>
            </div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsEditTaskModalOpen(false)}>Cancel</Button><Button className="gradient-button" onClick={handleEditTask} disabled={isSubmitting}>{isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteTaskDialogOpen} onOpenChange={setIsDeleteTaskDialogOpen}><AlertDialogContent className="glass-card border-border/30"><AlertDialogHeader><AlertDialogTitle>Delete Task</AlertDialogTitle><AlertDialogDescription>Are you sure?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteTask} className="bg-destructive hover:bg-destructive/90" disabled={isSubmitting}>{isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent></AlertDialog>
    </DashboardLayout>
  );
};

export default ProjectDetailsPage;
