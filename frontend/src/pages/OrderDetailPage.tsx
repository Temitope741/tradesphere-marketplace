import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogTrigger,
} from '@/components/ui/dialog';
import { OrderStatusTimeline, StatusHistoryEntry } from '@/components/orders/OrderStatusTimeline';
import { ArrowLeft, Package, CheckCircle, Clock, CreditCard, AlertTriangle, Flag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface OrderItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    imageUrl: string;
  };
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

interface Dispute {
  status: 'none' | 'open' | 'resolved';
  reason?: string;
  description?: string;
  raisedAt?: string;
  resolution?: string;
  resolvedAt?: string;
}

interface OrderDetail {
  _id: string;
  orderNumber?: string;
  vendor: {
    fullName: string;
    email: string;
    phone?: string;
  };
  items: OrderItem[];
  totalAmount: number;
  shippingAddress: string;
  phone: string;
  status: string;
  statusHistory?: StatusHistoryEntry[];
  paymentMethod: string;
  paymentStatus: string;
  trackingNumber?: string;
  createdAt: string;
  dispute?: Dispute;
}

function formatDateTime(dateString: string) {
  return new Date(dateString).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function getPaymentStatusBadge(paymentStatus: string) {
  switch (paymentStatus) {
    case 'approved':
      return (
        <Badge variant="default" className="bg-green-500">
          <CheckCircle className="h-3 w-3 mr-1" />
          Payment Approved
        </Badge>
      );
    case 'paid':
      return (
        <Badge variant="default" className="bg-blue-500">
          <CreditCard className="h-3 w-3 mr-1" />
          Paid
        </Badge>
      );
    default:
      return (
        <Badge variant="secondary">
          <Clock className="h-3 w-3 mr-1" />
          Payment Pending
        </Badge>
      );
  }
}

export default function OrderDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [order, setOrder] = useState<OrderDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [disputeOpen, setDisputeOpen] = useState(false);
  const [disputeReason, setDisputeReason] = useState('');
  const [disputeDescription, setDisputeDescription] = useState('');
  const [submittingDispute, setSubmittingDispute] = useState(false);

  useEffect(() => {
    if (id) fetchOrder();
  }, [id]);

  const fetchOrder = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        navigate('/auth');
        return;
      }

      const response = await api.getOrder(id!);
      if (response.success) {
        setOrder(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching order:', error);
      toast({
        title: 'Error',
        description: error.message || 'Failed to load this order.',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleRaiseDispute = async () => {
    if (!disputeReason.trim()) {
      toast({
        title: 'Reason required',
        description: 'Please give a short reason for the problem.',
        variant: 'destructive',
      });
      return;
    }

    setSubmittingDispute(true);
    try {
      const response = await api.raiseDispute(id!, {
        reason: disputeReason.trim(),
        description: disputeDescription.trim(),
      });
      if (response.success) {
        setOrder(response.data);
        setDisputeOpen(false);
        setDisputeReason('');
        setDisputeDescription('');
        toast({
          title: 'Problem reported',
          description: 'The vendor has been notified and will follow up with you.',
        });
      }
    } catch (error: any) {
      toast({
        title: 'Could not report this problem',
        description: error.message || 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSubmittingDispute(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Order not found</h2>
          <Button onClick={() => navigate('/orders')}>Back to Orders</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <Button variant="ghost" onClick={() => navigate('/orders')} className="mb-4 -ml-2">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Orders
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h1 className="text-3xl font-bold">
              Order #{order.orderNumber || order._id.slice(-8)}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              Placed on{' '}
              {new Date(order.createdAt).toLocaleDateString('en-US', {
                year: 'numeric',
                month: 'long',
                day: 'numeric',
              })}
            </p>
          </div>
          {getPaymentStatusBadge(order.paymentStatus)}
        </div>

        {/* Status timeline */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Order Status</CardTitle>
          </CardHeader>
          <CardContent className="pb-6">
            <OrderStatusTimeline
              status={order.status}
              statusHistory={order.statusHistory}
              createdAt={order.createdAt}
            />
          </CardContent>
        </Card>

        {/* Items */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {order.items.map((item) => (
                <div key={item._id} className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                    {item.product.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Package className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold">{item.product.name}</p>
                    <p className="text-sm text-muted-foreground">
                      Quantity: {item.quantity} × ₦{item.unitPrice.toFixed(2)}
                    </p>
                  </div>
                  <p className="font-semibold">₦{item.totalPrice.toLocaleString()}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Dispute status, if one has been raised */}
        {order.dispute && order.dispute.status !== 'none' && (
          <Card className="mb-6 border-amber-400/40 bg-amber-50/50 dark:bg-amber-950/10">
            <CardHeader>
              <CardTitle className="text-base font-semibold flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-600" />
                Reported Problem
                <Badge variant={order.dispute.status === 'resolved' ? 'default' : 'secondary'}>
                  {order.dispute.status === 'resolved' ? 'Resolved' : 'Open'}
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div>
                <p className="text-muted-foreground">Reason</p>
                <p className="font-medium">{order.dispute.reason}</p>
              </div>
              {order.dispute.description && (
                <div>
                  <p className="text-muted-foreground">Details</p>
                  <p>{order.dispute.description}</p>
                </div>
              )}
              {order.dispute.raisedAt && (
                <p className="text-xs text-muted-foreground">
                  Reported on {formatDateTime(order.dispute.raisedAt)}
                </p>
              )}
              {order.dispute.status === 'resolved' && order.dispute.resolution && (
                <div className="pt-2 border-t">
                  <p className="text-muted-foreground">Vendor's resolution</p>
                  <p className="font-medium">{order.dispute.resolution}</p>
                  {order.dispute.resolvedAt && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Resolved on {formatDateTime(order.dispute.resolvedAt)}
                    </p>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Report a problem */}
        {(!order.dispute || order.dispute.status === 'none') && (
          <div className="mb-6">
            <Dialog open={disputeOpen} onOpenChange={setDisputeOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" className="text-destructive border-destructive/40 hover:bg-destructive/5">
                  <Flag className="mr-2 h-4 w-4" />
                  Report a Problem
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Report a problem with this order</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="space-y-2">
                    <Label htmlFor="dispute-reason">What went wrong?</Label>
                    <Input
                      id="dispute-reason"
                      placeholder="e.g. Item not delivered, wrong item, damaged"
                      value={disputeReason}
                      onChange={(e) => setDisputeReason(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="dispute-description">More details (optional)</Label>
                    <Textarea
                      id="dispute-description"
                      placeholder="Add any extra details that will help the vendor sort this out."
                      value={disputeDescription}
                      onChange={(e) => setDisputeDescription(e.target.value)}
                      rows={4}
                    />
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="ghost" onClick={() => setDisputeOpen(false)} disabled={submittingDispute}>
                    Cancel
                  </Button>
                  <Button onClick={handleRaiseDispute} disabled={submittingDispute}>
                    {submittingDispute ? 'Submitting...' : 'Submit Report'}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>
        )}

        {/* Order details */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base font-semibold">Order Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Vendor:</span>
              <span className="font-semibold">{order.vendor?.fullName || 'Unknown'}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Shipping Address:</span>
              <span className="font-semibold text-right max-w-xs">{order.shippingAddress}</span>
            </div>
            {order.phone && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Phone:</span>
                <span className="font-semibold">{order.phone}</span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-muted-foreground">Payment Method:</span>
              <span className="font-semibold capitalize">
                {order.paymentMethod?.replace(/_/g, ' ') || 'N/A'}
              </span>
            </div>
            {order.trackingNumber && (
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Tracking:</span>
                <span className="font-mono text-sm">{order.trackingNumber}</span>
              </div>
            )}
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total:</span>
              <span className="text-primary">₦{order.totalAmount.toLocaleString()}</span>
            </div>
          </CardContent>
        </Card>

        <div className="mt-6 text-center text-sm text-muted-foreground">
          Questions about this order?{' '}
          <Link to="/orders" className="text-primary hover:underline">
            View all your orders
          </Link>
        </div>
      </div>
    </div>
  );
}