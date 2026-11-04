import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Users, Store, ShoppingCart, AlertTriangle, Banknote, Package } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Stats {
  users: { customer: number; vendor: number; admin: number };
  orders: { total: number; pending: number };
  disputes: { open: number; resolved: number };
  revenue: number;
  activeProducts: number;
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      try {
        const response = await api.getAdminStats();
        if (response.success) setStats(response.data);
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load platform stats.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!stats) {
    return <p className="text-muted-foreground">Could not load platform stats.</p>;
  }

  const tiles = [
    { label: 'Customers', value: stats.users.customer.toLocaleString(), icon: Users },
    { label: 'Vendors', value: stats.users.vendor.toLocaleString(), icon: Store },
    { label: 'Total Orders', value: stats.orders.total.toLocaleString(), icon: ShoppingCart },
    { label: 'Active Products', value: stats.activeProducts.toLocaleString(), icon: Package },
    { label: 'Revenue (paid orders)', value: `₦${stats.revenue.toLocaleString()}`, icon: Banknote },
    { label: 'Pending Orders', value: stats.orders.pending.toLocaleString(), icon: ShoppingCart },
  ];

  return (
    <div className="space-y-8">
      <h1 className="text-4xl font-bold">Platform Overview</h1>

      {stats.disputes.open > 0 && (
        <Card className="border-amber-400/50 bg-amber-50/60 dark:bg-amber-950/10">
          <CardContent className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-6">
            <div className="flex items-center gap-3">
              <AlertTriangle className="h-6 w-6 text-amber-600" />
              <div>
                <p className="font-semibold">
                  {stats.disputes.open} open dispute{stats.disputes.open === 1 ? '' : 's'} need
                  attention
                </p>
                <p className="text-sm text-muted-foreground">
                  Customers have reported problems that vendors haven't resolved yet.
                </p>
              </div>
            </div>
            <Button asChild>
              <Link to="/admin/orders?dispute=open">Review disputes</Link>
            </Button>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {tiles.map(({ label, value, icon: Icon }) => (
          <Card key={label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
              <Icon className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <p className="text-2xl font-bold">{value}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <p className="text-sm text-muted-foreground">
        {stats.disputes.resolved} dispute{stats.disputes.resolved === 1 ? '' : 's'} resolved so far.
      </p>
    </div>
  );
}