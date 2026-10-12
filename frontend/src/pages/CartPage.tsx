import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Trash2, Plus, Minus, ShoppingBag } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface CartItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    price: number;
    imageUrl: string;
    stockQuantity: number;
    vendor: {
      fullName: string;
    };
  };
  quantity: number;
}

interface Cart {
  _id: string;
  items: CartItem[];
  totalAmount?: number;
  totalPrice?: number;
  totalItems?: number;
}

export default function CartPage() {
  const [cart, setCart] = useState<Cart | null>(null);
  const [loading, setLoading] = useState(true);
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
      if (response.success) {
        setCart(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching cart:', error);
      if (error.message?.includes('authorized') || error.message?.includes('login')) {
        navigate('/auth');
      } else {
        toast({
          title: "Error",
          description: "Failed to load cart. Please try again.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const updateQuantity = async (productId: string, newQuantity: number) => {
    if (newQuantity < 1) return;

    try {
      const response = await api.updateCartItem(productId, newQuantity);
      if (response.success) {
        fetchCart();
        toast({
          title: "Updated",
          description: "Cart item quantity updated.",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update quantity. Please try again.",
        variant: "destructive",
      });
    }
  };

  const removeItem = async (productId: string) => {
    try {
      const response = await api.removeFromCart(productId);
      if (response.success) {
        toast({ 
          title: "Item removed", 
          description: "Item has been removed from cart." 
        });
        fetchCart();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to remove item. Please try again.",
        variant: "destructive",
      });
    }
  };

  const clearCart = async () => {
    try {
      const response = await api.clearCart();
      if (response.success) {
        toast({
          title: "Cart cleared",
          description: "All items have been removed from your cart.",
        });
        fetchCart();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to clear cart. Please try again.",
        variant: "destructive",
      });
    }
  };

  // Calculate totals from cart items (real-time calculation as backup)
  const { subtotal, totalItems, itemSubtotals } = useMemo(() => {
    const cartItems = cart?.items || [];
    
    const itemSubtotals = cartItems.map(item => ({
      id: item.product._id,
      subtotal: item.product.price * item.quantity
    }));
    
    const subtotal = cartItems.reduce((sum, item) => {
      return sum + (item.product.price * item.quantity);
    }, 0);
    
    const totalItems = cartItems.reduce((sum, item) => sum + item.quantity, 0);
    
    return { subtotal, totalItems, itemSubtotals };
  }, [cart?.items]);

  // Use backend calculated total if available, otherwise use frontend calculation
  const total = cart?.totalAmount || cart?.totalPrice || subtotal;
  const cartItems = cart?.items || [];

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
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-4xl font-bold">Shopping Cart</h1>
          {cartItems.length > 0 && (
            <Button variant="outline" onClick={clearCart}>
              Clear Cart
            </Button>
          )}
        </div>

        {cartItems.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingBag className="h-24 w-24 text-muted-foreground mx-auto mb-4" />
            <h2 className="text-2xl font-semibold mb-2">Your cart is empty</h2>
            <p className="text-muted-foreground mb-6">Add some items to get started!</p>
            <Button onClick={() => navigate('/shop')}>Continue Shopping</Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Cart Items */}
            <div className="lg:col-span-2 space-y-4">
              {cartItems.map((item) => {
                const itemSubtotal = itemSubtotals.find(s => s.id === item.product._id)?.subtotal || 0;
                
                return (
                  <Card key={item._id}>
                    <CardContent className="p-4">
                      <div className="flex flex-col sm:flex-row gap-4">
                        <div className="w-full sm:w-24 h-24 rounded-lg overflow-hidden bg-muted flex-shrink-0">
                          {item.product.imageUrl ? (
                            <img
                              src={item.product.imageUrl}
                              alt={item.product.name}
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center">
                              <ShoppingBag className="h-8 w-8 text-muted-foreground" />
                            </div>
                          )}
                        </div>

                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{item.product.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2">
                            by {item.product.vendor?.fullName || 'Unknown Vendor'}
                          </p>
                          <div className="flex items-center gap-3">
                            <p className="text-lg font-bold text-primary">
                              ₦{item.product.price.toLocaleString()}
                            </p>
                            <span className="text-sm text-muted-foreground">× {item.quantity}</span>
                          </div>
                          <p className="text-sm font-semibold mt-1">
                            Subtotal: ₦{itemSubtotal.toLocaleString()}
                          </p>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end justify-between sm:justify-start gap-4">
                          <div className="flex items-center border rounded-lg">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuantity(item.product._id, item.quantity - 1)}
                              disabled={item.quantity <= 1}
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                            <span className="px-4 font-semibold">{item.quantity}</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => updateQuantity(item.product._id, item.quantity + 1)}
                              disabled={item.quantity >= item.product.stockQuantity}
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                          </div>

                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeItem(item.product._id)}
                          >
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>

                      {item.quantity >= item.product.stockQuantity && (
                        <div className="mt-2 text-sm text-orange-500">
                          Maximum stock reached
                        </div>
                      )}
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            {/* Order Summary */}
            <div>
              <Card className="sticky top-20">
                <CardContent className="p-6">
                  <h2 className="text-xl font-bold mb-4">Order Summary</h2>

                  <div className="space-y-3 mb-6">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Subtotal</span>
                      <span className="font-semibold">₦{subtotal.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Items</span>
                      <span className="font-semibold">{totalItems} {totalItems === 1 ? 'item' : 'items'}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Delivery Fee</span>
                      <span className="font-semibold text-green-600">pending confirmation</span>
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
                    onClick={() => navigate('/checkout')}
                    disabled={cartItems.length === 0}
                  >
                    Proceed to Checkout ({totalItems} {totalItems === 1 ? 'item' : 'items'})
                  </Button>

                  <Button
                    variant="ghost"
                    className="w-full mt-2"
                    onClick={() => navigate('/shop')}
                  >
                    Continue Shopping
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}