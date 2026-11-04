import { useEffect, useState } from 'react';
import api from '@/services/api';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';

interface AdminUser {
  _id: string;
  fullName: string;
  email: string;
  role: 'customer' | 'vendor' | 'admin';
  isActive: boolean;
  createdAt: string;
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState('all');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [target, setTarget] = useState<AdminUser | null>(null);
  const [working, setWorking] = useState(false);
  const { toast } = useToast();

  // Wait briefly after typing stops before searching
  useEffect(() => {
    const t = setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = { page, limit: 15 };
        if (role !== 'all') params.role = role;
        if (search) params.search = search;
        const response = await api.getAdminUsers(params);
        if (response.success) {
          setUsers(response.data);
          setPagination(response.pagination);
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load users.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [role, search, page]);

  const confirmToggle = async () => {
    if (!target) return;
    setWorking(true);
    try {
      const response = await api.setUserStatus(target._id, !target.isActive);
      if (response.success) {
        setUsers((prev) =>
          prev.map((u) => (u._id === target._id ? { ...u, isActive: !target.isActive } : u))
        );
        toast({ title: response.message || 'Account updated' });
      }
    } catch (error: any) {
      toast({
        title: 'Could not update account',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setWorking(false);
      setTarget(null);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">Users</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <Input
          placeholder="Search by name or email"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="sm:max-w-xs"
        />
        <Select
          value={role}
          onValueChange={(v) => {
            setRole(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by role" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All roles</SelectItem>
            <SelectItem value="customer">Customers</SelectItem>
            <SelectItem value="vendor">Vendors</SelectItem>
            <SelectItem value="admin">Admins</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="flex items-center justify-center py-16">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
            </div>
          ) : users.length === 0 ? (
            <p className="text-center text-muted-foreground py-16">No users found.</p>
          ) : (
            <div className="divide-y">
              {users.map((u) => (
                <div
                  key={u._id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4"
                >
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{u.fullName}</p>
                    <p className="text-sm text-muted-foreground truncate">{u.email}</p>
                    <p className="text-xs text-muted-foreground mt-1">
                      Joined {new Date(u.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline" className="capitalize">
                      {u.role}
                    </Badge>
                    <Badge variant={u.isActive ? 'default' : 'destructive'}>
                      {u.isActive ? 'Active' : 'Deactivated'}
                    </Badge>
                    {u.role !== 'admin' && (
                      <Button
                        size="sm"
                        variant={u.isActive ? 'outline' : 'default'}
                        onClick={() => setTarget(u)}
                      >
                        {u.isActive ? 'Deactivate' : 'Reactivate'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.currentPage} of {pagination.totalPages} · {pagination.totalItems} users
          </p>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => p - 1)}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= pagination.totalPages}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      <AlertDialog open={!!target} onOpenChange={(open) => !open && setTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {target?.isActive ? 'Deactivate this account?' : 'Reactivate this account?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {target?.isActive
                ? `${target?.fullName} will be signed out and unable to log in.${
                    target?.role === 'vendor'
                      ? ' Their products will also be hidden from the shop.'
                      : ''
                  }`
                : `${target?.fullName} will be able to log in again.${
                    target?.role === 'vendor' ? ' Their products will be visible again.' : ''
                  }`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={working}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmToggle} disabled={working}>
              {working ? 'Saving...' : 'Confirm'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}