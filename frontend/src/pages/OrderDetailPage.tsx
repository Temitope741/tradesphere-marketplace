import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import api from '@/services/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { OrderStatusTimeline, StatusHistoryEntry } from '@/components/orders/OrderStatusTimeline';
import { ArrowLeft, Package, CheckCircle, Clock, CreditCard } from 'lucide-react';
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