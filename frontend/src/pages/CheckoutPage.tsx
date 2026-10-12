import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { Building2, CreditCard, Banknote, Copy, CheckCircle } from 'lucide-react';

interface CartItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    price: number;
  };
  quantity: number;
}

interface Cart {
  items: CartItem[];
  totalAmount?: number;
  totalPrice?: number;
}

type PaymentMethod = 'cash_on_delivery' | 'bank_transfer' | 'nomba';

export default function CheckoutPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [shippingAddress, setShippingAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash_on_delivery');
  const [transferReference, setTransferReference] = useState('');
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [copied, setCopied] = useState(false);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchCart();
  }, []);

  const fetchCart = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        navigate('/auth');
        return;
      }

      const response = await api.getCart();
      if (response.success && response.data) {
        if (response.data.items && response.data.items.length > 0) {
          setCart(response.data);
        } else {
          toast({
            title: "Cart is empty",
            description: "Add items to your cart before checkout.",
          });
          navigate('/cart');
        }
      }
    } catch (error: any) {
      console.error('Error fetching cart:', error);
      if (error.message?.includes('authorized') || error.message?.includes('login')) {
        navigate('/auth');
      } else {
        navigate('/cart');
      }
    } finally {
      setLoading(false);
    }
  };

  // Calculate totals from cart items (real-time calculation)
  const { subtotal, totalItems } = useMemo(() => {
    const cartItems = cart?.items || [];

    const subtotal = cartItems.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);

    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);

    return { subtotal, totalItems };
  }, [cart?.items]);

  // Use backend calculated total if available, otherwise use frontend calculation
  const total = cart?.totalAmount || cart?.totalPrice || subtotal;
  const cartItems = cart?.items || [];

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    toast({
      title: "Copied!",
      description: `${label} copied to clipboard`,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  const placeOrder = async () => {
    if (!shippingAddress.trim()) {
      toast({
        title: "Address required",
        description: "Please provide a shipping address.",
        variant: "destructive",
      });
      return;
    }

    if (!phone.trim()) {
      toast({
        title: "Phone number required",
        description: "Please provide a contact phone number.",
        variant: "destructive",
      });
      return;
    }

    if (paymentMethod === 'bank_transfer' && !transferReference.trim()) {
      toast({
        title: "Reference required",
        description: "Please enter your transfer reference number.",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    try {
      const orderData = {
        shippingAddress,
        phone,
        paymentMethod,
        paymentReference: paymentMethod === 'bank_transfer' ? transferReference : undefined
      };

      const response = await api.createOrder(orderData);

      if (response.success) {
        // Nomba: redirect to the hosted checkout page — card and bank
        // transfer are both handled there, no separate widget needed.
        if (paymentMethod === 'nomba' && response.data?.checkoutLink) {
          window.location.href = response.data.checkoutLink;
          return; // navigating away, nothing else to do here
        }

        if (paymentMethod === 'bank_transfer') {
          toast({
            title: "Order placed!",
            description: "Please complete the bank transfer. Your order will be processed after payment verification.",
          });
        } else {
          toast({
            title: "Order placed successfully!",
            description: "You will receive a confirmation shortly.",
          });
        }

        navigate('/orders');
      }
    } catch (error: any) {
      console.error('Order error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to place order. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <h1 className="text-4xl font-bold mb-8">Checkout</h1>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Form */}
          <div className="lg:col-span-2 space-y-6">
            {/* Shipping Details */}
            <Card>
              <CardHeader>
                <CardTitle>Shipping Details</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <Label htmlFor="address">Delivery Address *</Label>
                  <Textarea
                    id="address"
                    placeholder="Enter your full delivery address (street, city, state, postal code)..."
                    value={shippingAddress}
                    onChange={(e) => setShippingAddress(e.target.value)}
                    rows={4}
                    required
                  />
                </div>

                <div>
                  <Label htmlFor="phone">Phone Number *</Label>
                  <Input
                    id="phone"
                    type="tel"
                    placeholder="+234 XXX XXX XXXX"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    required
                  />
                </div>
              </CardContent>
            </Card>

            {/* Payment Method */}
            <Card>
              <CardHeader>
                <CardTitle>Payment Method</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {/* Cash on Delivery */}
                  <label className={`flex items-center space-x-3 cursor-pointer p-4 border-2 rounded-lg hover:bg-accent transition-colors ${
                    paymentMethod === 'cash_on_delivery' ? 'border-primary bg-primary/5' : 'border-gray-200'
                  }`}>
                    <input
                      type="radio"
                      name="payment"
                      value="cash_on_delivery"
                      checked={paymentMethod === 'cash_on_delivery'}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-4 h-4 text-primary"
                    />
                    <Banknote className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <div className="font-semibold">Cash on Delivery</div>
                      <div className="text-sm text-muted-foreground">Pay when you receive your order</div>
                    </div>
                  </label>

                  {/* Manual Bank Transfer (existing flow, unchanged) */}
                  <label className={`flex items-center space-x-3 cursor-pointer p-4 border-2 rounded-lg hover:bg-accent transition-colors ${
                    paymentMethod === 'bank_transfer' ? 'border-primary bg-primary/5' : 'border-gray-200'
                  }`}>
                    <input
                      type="radio"
                      name="payment"
                      value="bank_transfer"
                      checked={paymentMethod === 'bank_transfer'}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-4 h-4 text-primary"
                    />
                    <Building2 className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <div className="font-semibold">Bank Transfer (Manual)</div>
                      <div className="text-sm text-muted-foreground">Transfer directly and submit your reference</div>
                    </div>
                  </label>

                  {/* Nomba — card or transfer, handled on Nomba's hosted page */}
                  <label className={`flex items-center space-x-3 cursor-pointer p-4 border-2 rounded-lg hover:bg-accent transition-colors ${
                    paymentMethod === 'nomba' ? 'border-primary bg-primary/5' : 'border-gray-200'
                  }`}>
                    <input
                      type="radio"
                      name="payment"
                      value="nomba"
                      checked={paymentMethod === 'nomba'}
                      onChange={(e) => setPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-4 h-4 text-primary"
                    />
                    <CreditCard className="h-5 w-5 text-primary" />
                    <div className="flex-1">
                      <div className="font-semibold">Pay Online (Card / Transfer)</div>
                      <div className="text-sm text-muted-foreground">Pay securely — powered by Nomba</div>
                    </div>
                    <Badge variant="secondary" className="text-xs">Secure</Badge>
                  </label>
                </div>

                {/* Bank Transfer Details Card */}
                {paymentMethod === 'bank_transfer' && (
                  <Card className="border-2 border-blue-200 bg-blue-50">
                    <CardHeader>
                      <CardTitle className="text-lg flex items-center gap-2">
                        <Building2 className="h-5 w-5" />
                        Bank Transfer Details
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <div>
                            <p className="text-sm text-muted-foreground">Bank Name</p>
                            <p className="font-semibold">First Bank of Nigeria</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard('First Bank of Nigeria', 'Bank name')}
                          >
                            {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <div>
                            <p className="text-sm text-muted-foreground">Account Number</p>
                            <p className="font-semibold text-lg">1234567890</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard('1234567890', 'Account number')}
                          >
                            {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>

                        <div className="flex justify-between items-center p-3 bg-white rounded-lg">
                          <div>
                            <p className="text-sm text-muted-foreground">Account Name</p>
                            <p className="font-semibold">TradeSphere Limited</p>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard('TradeSphere Limited', 'Account name')}
                          >
                            {copied ? <CheckCircle className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                          </Button>
                        </div>

                        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg">
                          <p className="text-sm font-medium text-amber-800">
                            ⚠️ Amount to Transfer: ₦{total.toLocaleString()}
                          </p>
                        </div>
                      </div>

                      <Separator />

                      <div>
                        <Label htmlFor="transferRef">Transfer Reference Number *</Label>
                        <Input
                          id="transferRef"
                          placeholder="Enter your transfer reference/transaction ID"
                          value={transferReference}
                          onChange={(e) => setTransferReference(e.target.value)}
                          required
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Please enter the reference number from your bank transfer receipt
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {paymentMethod === 'nomba' && (
                  <p className="text-sm text-muted-foreground px-1">
                    You'll be redirected to Nomba's secure checkout page to complete your payment by card or bank transfer.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Order Summary - Sticky Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-4">
              <CardHeader>
                <CardTitle>Order Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4 mb-6">
                  {cartItems.map((item) => (
                    <div key={item._id} className="flex justify-between text-sm">
                      <span className="text-muted-foreground">
                        {item.product.name} × {item.quantity}
                      </span>
                      <span className="font-semibold">
                        ₦{(item.product.price * item.quantity).toLocaleString()}
                      </span>
                    </div>
                  ))}

                  <Separator />

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-semibold">₦{subtotal.toLocaleString()}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Items</span>
                    <span className="font-semibold">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Delivery fee</span>
                    <span className="font-semibold text-green-600">Pay on delivery</span>
                  </div>

                  <Separator />

                  <div className="flex justify-between text-lg">
                    <span className="font-bold">Total</span>
                    <span className="font-bold text-primary">₦{total.toLocaleString()}</span>
                  </div>
                </div>

                <Button
                  className="w-full"
                  size="lg"
                  onClick={placeOrder}
                  disabled={submitting || !shippingAddress || !phone || (paymentMethod === 'bank_transfer' && !transferReference)}
                >
                  {submitting ? 'Processing...' : paymentMethod === 'nomba' ? 'Proceed to Payment' : 'Place Order'}
                </Button>

                <Button
                  variant="ghost"
                  className="w-full mt-2"
                  onClick={() => navigate('/cart')}
                  disabled={submitting}
                >
                  Back to Cart
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}