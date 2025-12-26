import React, { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import DashboardLayout from '@/components/layouts/DashboardLayout';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { tenantsApi, Tenant } from '@/lib/api';
import { Building2, Search, Loader2, Users, FolderKanban, Calendar } from 'lucide-react';
import { cn } from '@/lib/utils';

const TenantsPage: React.FC = () => {
    const { user } = useAuth();
    const { toast } = useToast();
    const [tenants, setTenants] = useState<Tenant[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');

    const fetchTenants = async () => {
        try {
            const response = await tenantsApi.getAll({ limit: 100 });
            if (response.success && response.data) {
                setTenants(response.data.tenants);
            }
        } catch (error: any) {
            toast({
                title: "Error loading tenants",
                description: error.message,
                variant: "destructive",
            });
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchTenants();
    }, []);

    const filteredTenants = tenants.filter(tenant =>
        tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        tenant.subdomain.toLowerCase().includes(searchQuery.toLowerCase())
    );

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

    const getStatusBadgeClass = (status: string) => {
        switch (status) {
            case 'active':
                return 'badge-active';
            case 'suspended':
                return 'badge-suspended';
            default:
                return 'badge-todo';
        }
    };

    // Only super admins should access this page
    if (user?.role !== 'super_admin') {
        return (
            <DashboardLayout>
                <div className="glass-card p-12 text-center">
                    <Building2 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                    <h3 className="text-xl font-semibold mb-2">Access Denied</h3>
                    <p className="text-muted-foreground">Only super administrators can access this page.</p>
                </div>
            </DashboardLayout>
        );
    }

    return (
        <DashboardLayout
            title="Tenants"
            subtitle="Manage all organizations"
        >
            <div className="space-y-6">
                {/* Search */}
                <div className="glass-card p-4">
                    <div className="relative">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                        <input
                            type="text"
                            placeholder="Search tenants..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="glass-input pl-12"
                        />
                    </div>
                </div>

                {/* Tenants Grid */}
                {isLoading ? (
                    <div className="flex items-center justify-center h-[40vh]">
                        <Loader2 className="h-10 w-10 animate-spin text-primary" />
                    </div>
                ) : filteredTenants.length === 0 ? (
                    <div className="glass-card p-12 text-center">
                        <Building2 className="h-16 w-16 mx-auto text-muted-foreground/50 mb-4" />
                        <h3 className="text-xl font-semibold mb-2">No tenants found</h3>
                        <p className="text-muted-foreground">
                            {searchQuery ? 'Try adjusting your search' : 'No organizations registered yet'}
                        </p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {filteredTenants.map((tenant) => (
                            <div
                                key={tenant.id}
                                className="glass-card-hover p-6"
                            >
                                <div className="flex items-start justify-between mb-4">
                                    <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center">
                                        <Building2 className="h-6 w-6 text-primary" />
                                    </div>
                                    <div className="flex flex-col gap-2 items-end">
                                        <span className={cn('px-2 py-1 rounded-lg text-xs', getStatusBadgeClass(tenant.status))}>
                                            {tenant.status}
                                        </span>
                                        <span className={cn('px-2 py-1 rounded-lg text-xs', getPlanBadgeClass(tenant.subscriptionPlan))}>
                                            {tenant.subscriptionPlan?.toUpperCase()}
                                        </span>
                                    </div>
                                </div>

                                <h3 className="text-lg font-semibold text-foreground mb-1">{tenant.name}</h3>
                                <p className="text-sm text-muted-foreground mb-4">{tenant.subdomain}.yourapp.com</p>

                                <div className="space-y-2 pt-4 border-t border-border/30">
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <Users className="h-4 w-4" />
                                            Users
                                        </span>
                                        <span className="font-medium">{tenant.stats?.totalUsers || 0} / {tenant.maxUsers}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <FolderKanban className="h-4 w-4" />
                                            Projects
                                        </span>
                                        <span className="font-medium">{tenant.stats?.totalProjects || 0} / {tenant.maxProjects}</span>
                                    </div>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground flex items-center gap-2">
                                            <Calendar className="h-4 w-4" />
                                            Created
                                        </span>
                                        <span className="font-medium">{new Date(tenant.createdAt).toLocaleDateString()}</span>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </DashboardLayout>
    );
};

export default TenantsPage;
