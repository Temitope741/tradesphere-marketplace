import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import api from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Package,
  ShoppingCart,
  Wallet,
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  Settings,
  Inbox,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface RecentOrder {
  _id: string;
  orderNumber?: string;
  totalAmount: number;
  status: string;
  createdAt: string;
  customer?: { fullName: string };
  items?: { product?: { name: string }; quantity: number }[];
}

interface DashboardStats {
  totalProducts: number;
  totalOrders: number;
  totalRevenue: number;
  pendingOrders: number;
  processingOrders: number;
  deliveredOrders: number;
  lowStockProducts: number;
  recentOrders: RecentOrder[];
}

const EMPTY_STATS: DashboardStats = {
  totalProducts: 0,
  totalOrders: 0,
  totalRevenue: 0,
  pendingOrders: 0,
  processingOrders: 0,
  deliveredOrders: 0,
  lowStockProducts: 0,
  recentOrders: [],
};

const STATUS_STYLES: Record<string, string> = {
  pending: 'bg-amber-100 text-amber-700',
  processing: 'bg-blue-100 text-blue-700',
  shipped: 'bg-violet-100 text-violet-700',
  delivered: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
};

function formatNaira(amount: number) {
  return `₦${Math.round(amount).toLocaleString()}`;
}

export default function VendorDashboard() {
  const [stats, setStats] = useState<DashboardStats>(EMPTY_STATS);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    checkVendorAccess();
    fetchStats();
  }, []);

  const checkVendorAccess = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }
      const response = await api.getCurrentUser();
      if (response.success && response.data.role !== 'vendor') {
        toast({
          title: 'Access denied',
          description: 'Only vendors can access this page.',
          variant: 'destructive',
        });
        navigate('/');
      }
    } catch (error) {
      navigate('/auth');
    }
  };

  const fetchStats = async () => {
    try {
      const response = await api.getVendorDashboard();
      if (response.success) {
        setStats({ ...EMPTY_STATS, ...response.data });
      }
    } catch (error: any) {
      console.error('Error fetching stats:', error);
      toast({
        title: 'Could not load dashboard',
        description: 'Failed to load dashboard statistics. Try refreshing the page.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const fulfillmentRate =
    stats.totalOrders > 0 ? Math.round((stats.deliveredOrders / stats.totalOrders) * 100) : 0;
  const avgRevenuePerOrder =
    stats.totalOrders > 0 ? stats.totalRevenue / stats.totalOrders : 0;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground mt-1">Here's how your store is performing.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <StatCard
          loading={loading}
          icon={Package}
          iconClass="bg-primary/10 text-primary"
          label="Total products"
          value={stats.totalProducts}
          footer={
            stats.lowStockProducts > 0 ? (
              <span className="flex items-center gap-1 text-amber-600">
                <AlertTriangle className="h-3.5 w-3.5" />
                {stats.lowStockProducts} low on stock
              </span>
            ) : (
              'All products well stocked'
            )
          }
        />
        <StatCard
          loading={loading}
          icon={ShoppingCart}
          iconClass="bg-violet-100 text-violet-600"
          label="Total orders"
          value={stats.totalOrders}
          footer={`${stats.deliveredOrders} delivered`}
        />
        <StatCard
          loading={loading}
          icon={Wallet}
          iconClass="bg-emerald-100 text-emerald-600"
          label="Total revenue"
          value={formatNaira(stats.totalRevenue)}
          mono
          footer="All-time earnings"
        />
        <StatCard
          loading={loading}
          icon={Clock}
          iconClass="bg-amber-100 text-amber-600"
          label="Pending orders"
          value={stats.pendingOrders}
          footer={`${stats.processingOrders} processing`}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent orders */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base font-semibold">Recent orders</CardTitle>
            <Link
              to="/vendor/orders"
              className="text-sm text-primary font-medium flex items-center gap-1 hover:underline"
            >
              View all
              <ArrowUpRight className="h-3.5 w-3.5" />
            </Link>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="space-y-4">
                {[...Array(4)].map((_, i) => (
                  <Skeleton key={i} className="h-14 w-full" />
                ))}
              </div>
            ) : stats.recentOrders.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-12 text-muted-foreground">
                <Inbox className="h-10 w-10 mb-3 opacity-40" />
                <p className="font-medium text-foreground">No orders yet</p>
                <p className="text-sm">New orders will show up here as customers buy your products.</p>
              </div>
            ) : (
              <ul className="divide-y">
                {stats.recentOrders.map((order) => {
                  const firstItem = order.items?.[0];
                  const extraCount = (order.items?.length ?? 0) - 1;
                  return (
                    <li key={order._id} className="py-3 flex items-center justify-between gap-4">
                      <div className="min-w-0">
                        <p className="font-medium truncate">
                          {order.customer?.fullName ?? 'Customer'}
                        </p>
                        <p className="text-sm text-muted-foreground truncate">
                          {firstItem?.product?.name ?? 'Item'}
                          {extraCount > 0 ? ` +${extraCount} more` : ''}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="font-mono-price text-sm font-medium">
                          {formatNaira(order.totalAmount)}
                        </p>
                        <Badge
                          variant="secondary"
                          className={cn('mt-1 capitalize', STATUS_STYLES[order.status])}
                        >
                          {order.status}
                        </Badge>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        {/* Quick actions + performance */}
        <div className="space-y-6">
          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Quick actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <QuickAction to="/vendor/products" icon={Package} label="Manage products" />
              <QuickAction to="/vendor/orders" icon={ShoppingCart} label="View orders" />
              <QuickAction to="/profile" icon={Settings} label="Profile settings" />
            </CardContent>
          </Card>

          <Card className="shadow-card">
            <CardHeader>
              <CardTitle className="text-base font-semibold">Performance</CardTitle>
            </CardHeader>
            <CardContent className="space-y-5">
              <div>
                <div className="flex justify-between text-sm mb-1.5">
                  <span className="text-muted-foreground">Order fulfillment</span>
                  <span className="font-medium">{fulfillmentRate}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-primary h-2 rounded-full transition-all"
                    style={{ width: `${fulfillmentRate}%` }}
                  />
                </div>
              </div>
              <div className="flex items-center justify-between pt-1 border-t">
                <span className="text-sm text-muted-foreground flex items-center gap-1.5">
                  <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  Avg. revenue / order
                </span>
                <span className="font-mono-price font-medium">
                  {formatNaira(avgRevenuePerOrder)}
                </span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  loading,
  icon: Icon,
  iconClass,
  label,
  value,
  footer,
  mono,
}: {
  loading: boolean;
  icon: typeof Package;
  iconClass: string;
  label: string;
  value: string | number;
  footer: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <Card className="shadow-card">
      <CardContent className="p-5">
        <div className="flex items-center justify-between mb-3">
          <span className="text-sm text-muted-foreground font-medium">{label}</span>
          <div className={cn('h-9 w-9 rounded-full flex items-center justify-center', iconClass)}>
            <Icon className="h-4.5 w-4.5" />
          </div>
        </div>
        {loading ? (
          <Skeleton className="h-8 w-24 mb-2" />
        ) : (
          <div className={cn('text-2xl font-semibold', mono && 'font-mono-price')}>{value}</div>
        )}
        <p className="text-xs text-muted-foreground mt-1">{loading ? ' ' : footer}</p>
      </CardContent>
    </Card>
  );
}

function QuickAction({
  to,
  icon: Icon,
  label,
}: {
  to: string;
  icon: typeof Package;
  label: string;
}) {
  return (
    <Link
      to={to}
      className="flex items-center justify-between p-3 rounded-lg border hover:border-primary/40 hover:bg-primary/5 transition-colors group"
    >
      <span className="flex items-center gap-3 text-sm font-medium">
        <Icon className="h-4 w-4 text-primary" />
        {label}
      </span>
      <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
    </Link>
  );
}