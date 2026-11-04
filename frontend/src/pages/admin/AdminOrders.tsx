import { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import api from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface HistoryEntry {
  status: string;
  changedAt: string;
  changedByRole?: 'vendor' | 'admin' | 'system';
}

interface AdminOrder {
  _id: string;
  customer?: { fullName: string; email: string };
  vendor?: { fullName: string; email: string };
  items: { _id: string; quantity: number; product?: { name: string } }[];
  totalAmount: number;
  status: string;
  paymentStatus: string;
  paymentMethod: string;
  createdAt: string;
  statusHistory?: HistoryEntry[];
  dispute?: {
    status: 'none' | 'open' | 'resolved';
    reason?: string;
    description?: string;
    raisedAt?: string;
    resolution?: string;
    resolvedAt?: string;
  };
}

interface Pagination {
  currentPage: number;
  totalPages: number;
  totalItems: number;
}

export default function AdminOrders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [orders, setOrders] = useState<AdminOrder[]>([]);
  const [pagination, setPagination] = useState<Pagination | null>(null);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('all');
  const [dispute, setDispute] = useState(searchParams.get('dispute') || 'all');
  const [page, setPage] = useState(1);
  const [resolving, setResolving] = useState<AdminOrder | null>(null);
  const [resolution, setResolution] = useState('');
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const params: Record<string, string | number> = { page, limit: 10 };
        if (status !== 'all') params.status = status;
        if (dispute !== 'all') params.dispute = dispute;
        const response = await api.getAdminOrders(params);
        if (response.success) {
          setOrders(response.data);
          setPagination(response.pagination);
        }
      } catch (error: any) {
        toast({
          title: 'Error',
          description: error.message || 'Failed to load orders.',
          variant: 'destructive',
        });
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [status, dispute, page]);

  const changeDispute = (value: string) => {
    setDispute(value);
    setPage(1);
    setSearchParams(value === 'all' ? {} : { dispute: value });
  };

  const submitResolution = async () => {
    if (!resolving) return;
    if (!resolution.trim()) {
      toast({
        title: 'Resolution required',
        description: 'Please describe how this was resolved.',
        variant: 'destructive',
      });
      return;
    }
    setSaving(true);
    try {
      const response = await api.resolveDispute(resolving._id, { resolution: resolution.trim() });
      if (response.success) {
        setOrders((prev) =>
          prev.map((o) => (o._id === resolving._id ? { ...o, dispute: response.data.dispute } : o))
        );
        toast({ title: 'Dispute resolved' });
        setResolving(null);
        setResolution('');
      }
    } catch (error: any) {
      toast({
        title: 'Could not resolve dispute',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const roleText = (r?: string) => (r === 'vendor' ? 'vendor' : r === 'admin' ? 'admin' : 'system');

  return (
    <div className="space-y-6">
      <h1 className="text-4xl font-bold">Orders & Disputes</h1>

      <div className="flex flex-col sm:flex-row gap-3">
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(1);
          }}
        >
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Order status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="processing">Processing</SelectItem>
            <SelectItem value="shipped">Shipped</SelectItem>
            <SelectItem value="delivered">Delivered</SelectItem>
            <SelectItem value="cancelled">Cancelled</SelectItem>
          </SelectContent>
        </Select>

        <Select value={dispute} onValueChange={changeDispute}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Disputes" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All orders</SelectItem>
            <SelectItem value="open">Open disputes</SelectItem>
            <SelectItem value="resolved">Resolved disputes</SelectItem>
            <SelectItem value="any">Any dispute</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-16">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-primary"></div>
        </div>
      ) : orders.length === 0 ? (
        <p className="text-center text-muted-foreground py-16">No orders match these filters.</p>
      ) : (
        <div className="space-y-4">
          {orders.map((o) => (
            <Card key={o._id}>
              <CardHeader className="pb-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <CardTitle className="text-base">Order #{o._id.slice(-8)}</CardTitle>
                    <p className="text-xs text-muted-foreground mt-1">
                      {new Date(o.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="outline" className="capitalize">
                      {o.status}
                    </Badge>
                    <Badge variant="secondary" className="capitalize">
                      Payment: {o.paymentStatus}
                    </Badge>
                    {o.dispute?.status === 'open' && (
                      <Badge variant="destructive">
                        <AlertTriangle className="h-3 w-3 mr-1" />
                        Dispute Open
                      </Badge>
                    )}
                    {o.dispute?.status === 'resolved' && (
                      <Badge variant="outline">Dispute Resolved</Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="grid sm:grid-cols-2 gap-2">
                  <p>
                    <span className="text-muted-foreground">Customer:</span>{' '}
                    {o.customer?.fullName || 'Unknown'}{' '}
                    <span className="text-muted-foreground">({o.customer?.email})</span>
                  </p>
                  <p>
                    <span className="text-muted-foreground">Vendor:</span>{' '}
                    {o.vendor?.fullName || 'Unknown'}{' '}
                    <span className="text-muted-foreground">({o.vendor?.email})</span>
                  </p>
                </div>
                <p>
                  <span className="text-muted-foreground">Items:</span>{' '}
                  {o.items.map((i) => `${i.product?.name || 'Removed product'} ×${i.quantity}`).join(', ')}
                </p>
                <p className="font-semibold">Total: ₦{o.totalAmount.toLocaleString()}</p>

                {o.statusHistory && o.statusHistory.length > 0 && (
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium">Audit trail:</span>{' '}
                    {o.statusHistory
                      .map((h) => `${h.status} (${roleText(h.changedByRole)}, ${new Date(h.changedAt).toLocaleDateString()})`)
                      .join(' → ')}
                  </p>
                )}

                {o.dispute && o.dispute.status !== 'none' && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
                    <p className="font-semibold text-amber-800">Reported problem: {o.dispute.reason}</p>
                    {o.dispute.description && <p>{o.dispute.description}</p>}
                    {o.dispute.status === 'resolved' ? (
                      <p className="pt-1 border-t border-amber-200">
                        <span className="text-muted-foreground">Resolution:</span> {o.dispute.resolution}
                      </p>
                    ) : (
                      <Button size="sm" variant="outline" className="mt-2 bg-white" onClick={() => setResolving(o)}>
                        Resolve as admin
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Page {pagination.currentPage} of {pagination.totalPages} · {pagination.totalItems} orders
          </p>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
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

      <Dialog
        open={!!resolving}
        onOpenChange={(open) => {
          if (!open) {
            setResolving(null);
            setResolution('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Resolve dispute</DialogTitle>
          </DialogHeader>
          <div className="py-2 space-y-2">
            <p className="text-sm text-muted-foreground">
              Describe the outcome — both the customer and the vendor will see this note.
            </p>
            <Textarea
              value={resolution}
              onChange={(e) => setResolution(e.target.value)}
              rows={4}
              placeholder="e.g. Refund issued after vendor failed to ship."
            />
          </div>
          <DialogFooter>
            <Button variant="ghost" onClick={() => setResolving(null)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={submitResolution} disabled={saving}>
              {saving ? 'Saving...' : 'Confirm Resolution'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}