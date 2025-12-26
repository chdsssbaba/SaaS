import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { useToast } from '@/hooks/use-toast';
import { usersApi, User } from '@/lib/api';
import { Plus, Search, Users, Loader2, Edit, Trash2, Eye, EyeOff, Mail, Lock, User as UserIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

const UsersPage: React.FC = () => {
  const { tenant, user: currentUser } = useAuth();
  const { toast } = useToast();
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [formData, setFormData] = useState({ email: '', fullName: '', password: '', role: 'user' as 'user' | 'tenant_admin', isActive: true });

  const fetchUsers = async () => {
    try {
      const params: any = { limit: 100 };
      if (roleFilter !== 'all') params.role = roleFilter;
      if (searchQuery) params.search = searchQuery;

      let response;
      if (!tenant?.id) {
        // Super admin: fetch all users across all tenants
        response = await usersApi.getAll(params);
      } else {
        // Tenant admin/user: fetch users for their tenant
        response = await usersApi.getByTenant(tenant.id, params);
      }

      if (response.success && response.data) setUsers(response.data.users);
    } catch (error: any) {
      toast({ title: "Error loading users", description: error.message, variant: "destructive" });
    } finally { setIsLoading(false); }
  };

  useEffect(() => { fetchUsers(); }, [tenant?.id, roleFilter, searchQuery]);

  const handleCreateUser = async () => {
    if (!tenant?.id || !formData.email || !formData.fullName || !formData.password) {
      toast({ title: "Validation error", description: "All fields are required", variant: "destructive" }); return;
    }
    setIsSubmitting(true);
    try {
      const response = await usersApi.create(tenant.id, formData);
      if (response.success && response.data) {
        setUsers([response.data, ...users]);
        setIsCreateModalOpen(false);
        setFormData({ email: '', fullName: '', password: '', role: 'user', isActive: true });
        toast({ title: "User created", description: `${response.data.fullName} has been added` });
      }
    } catch (error: any) { toast({ title: "Error creating user", description: error.message, variant: "destructive" }); }
    finally { setIsSubmitting(false); }
  };

  const handleEditUser = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      const response = await usersApi.update(selectedUser.id, { fullName: formData.fullName, role: formData.role, isActive: formData.isActive });
      if (response.success && response.data) {
        setUsers(users.map(u => u.id === selectedUser.id ? { ...u, ...response.data } : u));
        setIsEditModalOpen(false); setSelectedUser(null);
        toast({ title: "User updated", description: "User has been updated successfully" });
      }
    } catch (error: any) { toast({ title: "Error updating user", description: error.message, variant: "destructive" }); }
    finally { setIsSubmitting(false); }
  };

  const handleDeleteUser = async () => {
    if (!selectedUser) return;
    setIsSubmitting(true);
    try {
      await usersApi.delete(selectedUser.id);
      setUsers(users.filter(u => u.id !== selectedUser.id));
      setIsDeleteDialogOpen(false); setSelectedUser(null);
      toast({ title: "User deleted", description: "User has been removed" });
    } catch (error: any) { toast({ title: "Error deleting user", description: error.message, variant: "destructive" }); }
    finally { setIsSubmitting(false); }
  };

  const openEditModal = (user: User) => {
    setSelectedUser(user);
    setFormData({ email: user.email, fullName: user.fullName, password: '', role: user.role as any, isActive: user.isActive });
    setIsEditModalOpen(true);
  };

  const getRoleBadgeClass = (role: string) => role === 'super_admin' ? 'role-super-admin' : role === 'tenant_admin' ? 'role-tenant-admin' : 'role-user';
  const getInitials = (name: string) => name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);

  return (
    <DashboardLayout title="Users" subtitle="Manage team members" actions={tenant ? <Button className="gradient-button" onClick={() => setIsCreateModalOpen(true)}><Plus className="h-4 w-4 mr-2" />Add User</Button> : undefined}>
      <div className="space-y-6">
        <div className="glass-card p-4 flex flex-col sm:flex-row gap-4">
          <div className="flex-1 relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
            <input type="text" placeholder="Search users..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="glass-input pl-12" />
          </div>
          <Select value={roleFilter} onValueChange={setRoleFilter}>
            <SelectTrigger className="w-full sm:w-48 h-12 glass-input"><SelectValue placeholder="Filter by role" /></SelectTrigger>
            <SelectContent className="glass-card border-border/30">
              <SelectItem value="all">All Roles</SelectItem>
              <SelectItem value="tenant_admin">Tenant Admin</SelectItem>
              <SelectItem value="user">User</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {isLoading ? <div className="flex items-center justify-center h-[40vh]"><Loader2 className="h-10 w-10 animate-spin text-primary" /></div> : users.length === 0 ? (
          <div className="glass-card p-12 text-center"><Users className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" /><h3 className="text-xl font-semibold mb-2">No users found</h3></div>
        ) : (
          <div className="glass-card overflow-hidden">
            <table className="w-full">
              <thead><tr className="border-b border-border/30 bg-muted/30">
                <th className="text-left p-4 font-medium">User</th>
                {!tenant && <th className="text-left p-4 font-medium">Tenant</th>}
                <th className="text-left p-4 font-medium">Role</th>
                <th className="text-left p-4 font-medium">Status</th>
                <th className="text-right p-4 font-medium">Actions</th>
              </tr></thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id} className="border-b border-border/20 hover:bg-muted/20 transition-colors">
                    <td className="p-4"><div className="flex items-center gap-3"><Avatar className="h-10 w-10 border border-primary/20"><AvatarFallback className="bg-primary/10 text-primary text-sm">{getInitials(user.fullName)}</AvatarFallback></Avatar><div><p className="font-medium">{user.fullName}</p><p className="text-sm text-muted-foreground">{user.email}</p></div></div></td>
                    {!tenant && <td className="p-4">{user.tenant ? <div><p className="font-medium text-sm">{user.tenant.name}</p><p className="text-xs text-muted-foreground">{user.tenant.subdomain}</p></div> : <span className="text-muted-foreground text-sm">No tenant</span>}</td>}
                    <td className="p-4"><span className={cn('px-2 py-1 rounded-lg text-xs', getRoleBadgeClass(user.role))}>{user.role.replace('_', ' ')}</span></td>
                    <td className="p-4"><span className={cn('px-2 py-1 rounded-lg text-xs', user.isActive ? 'badge-active' : 'badge-suspended')}>{user.isActive ? 'Active' : 'Inactive'}</span></td>
                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {tenant && <button onClick={() => openEditModal(user)} className="p-2 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors"><Edit className="h-4 w-4" /></button>}
                        {tenant && user.id !== currentUser?.id && <button onClick={() => { setSelectedUser(user); setIsDeleteDialogOpen(true); }} className="p-2 rounded-lg hover:bg-destructive/20 text-muted-foreground hover:text-destructive transition-colors"><Trash2 className="h-4 w-4" /></button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <Dialog open={isCreateModalOpen} onOpenChange={setIsCreateModalOpen}>
        <DialogContent className="glass-card border-border/30 sm:max-w-md">
          <DialogHeader><DialogTitle>Add New User</DialogTitle><DialogDescription>Add a team member to your organization</DialogDescription></DialogHeader>
          <div className="space-y-4 py-4">
            <div className="relative"><UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><input type="text" placeholder="Full Name" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="glass-input pl-12" /></div>
            <div className="relative"><Mail className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><input type="email" placeholder="Email" value={formData.email} onChange={(e) => setFormData({ ...formData, email: e.target.value })} className="glass-input pl-12" /></div>
            <div className="relative"><Lock className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" /><input type={showPassword ? 'text' : 'password'} placeholder="Password" value={formData.password} onChange={(e) => setFormData({ ...formData, password: e.target.value })} className="glass-input pl-12 pr-12" /><button type="button" onClick={() => setShowPassword(!showPassword)} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground">{showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}</button></div>
            <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as any })}><SelectTrigger className="glass-input"><SelectValue /></SelectTrigger><SelectContent className="glass-card border-border/30"><SelectItem value="user">User</SelectItem><SelectItem value="tenant_admin">Tenant Admin</SelectItem></SelectContent></Select>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsCreateModalOpen(false)}>Cancel</Button><Button className="gradient-button" onClick={handleCreateUser} disabled={isSubmitting}>{isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Add User</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isEditModalOpen} onOpenChange={setIsEditModalOpen}>
        <DialogContent className="glass-card border-border/30 sm:max-w-md">
          <DialogHeader><DialogTitle>Edit User</DialogTitle></DialogHeader>
          <div className="space-y-4 py-4">
            <input type="text" placeholder="Full Name" value={formData.fullName} onChange={(e) => setFormData({ ...formData, fullName: e.target.value })} className="glass-input" />
            <Select value={formData.role} onValueChange={(v) => setFormData({ ...formData, role: v as any })}><SelectTrigger className="glass-input"><SelectValue /></SelectTrigger><SelectContent className="glass-card border-border/30"><SelectItem value="user">User</SelectItem><SelectItem value="tenant_admin">Tenant Admin</SelectItem></SelectContent></Select>
            <div className="flex items-center space-x-2"><Checkbox id="active" checked={formData.isActive} onCheckedChange={(c) => setFormData({ ...formData, isActive: c as boolean })} /><label htmlFor="active" className="text-sm">Active</label></div>
          </div>
          <DialogFooter><Button variant="outline" onClick={() => setIsEditModalOpen(false)}>Cancel</Button><Button className="gradient-button" onClick={handleEditUser} disabled={isSubmitting}>{isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Save</Button></DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent className="glass-card border-border/30"><AlertDialogHeader><AlertDialogTitle>Delete User</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete {selectedUser?.fullName}?</AlertDialogDescription></AlertDialogHeader><AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteUser} className="bg-destructive hover:bg-destructive/90" disabled={isSubmitting}>{isSubmitting && <Loader2 className="h-4 w-4 animate-spin mr-2" />}Delete</AlertDialogAction></AlertDialogFooter></AlertDialogContent>
      </AlertDialog>
    </DashboardLayout>
  );
};

export default UsersPage;
