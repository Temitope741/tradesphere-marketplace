import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { Heart, ShoppingCart, Trash2 } from 'lucide-react';

interface WishlistItem {
  _id: string;
  product: {
    _id: string;
    name: string;
    price: number;
    imageUrl: string;
    stockQuantity: number;
    isActive: boolean;
  };
  createdAt: string;
}

interface Wishlist {
  _id: string;
  items: WishlistItem[];
}

export default function WishlistPage() {
  const [wishlist, setWishlist] = useState<Wishlist | null>(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchWishlist();
  }, []);

  const fetchWishlist = async () => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/auth');
        return;
      }

      const response = await api.getWishlist();
      if (response.success) {
        setWishlist(response.data);
      }
    } catch (error: any) {
      console.error('Error fetching wishlist:', error);
      if (error.message?.includes('authorized') || error.message?.includes('login')) {
        navigate('/auth');
      } else {
        toast({
          title: "Error",
          description: "Failed to load wishlist.",
          variant: "destructive",
        });
      }
    } finally {
      setLoading(false);
    }
  };

  const removeFromWishlist = async (productId: string) => {
    try {
      const response = await api.removeFromWishlist(productId);
      if (response.success) {
        // Update local state
        if (wishlist) {
          setWishlist({
            ...wishlist,
            items: wishlist.items.filter(item => item.product._id !== productId)
          });
        }
        toast({
          title: "Removed from wishlist",
          description: "Item has been removed from your wishlist.",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to remove item.",
        variant: "destructive",
      });
    }
  };

  const addToCart = async (product: any) => {
    try {
      const token = localStorage.getItem('token');
      
      if (!token) {
        navigate('/auth');
        return;
      }

      const response = await api.addToCart(product._id, 1);
      if (response.success) {
        toast({
          title: "✨ Added to cart!",
          description: `${product.name} has been added to your cart.`,
          className: "animate-scale-in",
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to add to cart.",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-primary"></div>
      </div>
    );
  }

  const wishlistItems = wishlist?.items || [];

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        <div className="flex items-center gap-3 mb-8">
          <Heart className="w-8 h-8 text-primary fill-primary" />
          <h1 className="text-4xl font-bold">My Wishlist</h1>
          {wishlistItems.length > 0 && (
            <span className="text-muted-foreground">({wishlistItems.length} items)</span>
          )}
        </div>

        {wishlistItems.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center">
              <Heart className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
              <p className="text-xl text-muted-foreground mb-2">Your wishlist is empty</p>
              <p className="text-sm text-muted-foreground mb-4">
                Start adding items you love to your wishlist
              </p>
              <Button onClick={() => navigate('/shop')}>
                Browse Products
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {wishlistItems.map((item) => (
              <Card key={item._id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <Link to={`/product/${item.product._id}`}>
                  <div className="aspect-square overflow-hidden bg-muted">
                    {item.product.imageUrl ? (
                      <img
                        src={item.product.imageUrl}
                        alt={item.product.name}
                        className="w-full h-full object-cover hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart className="h-16 w-16 text-muted-foreground" />
                      </div>
                    )}
                  </div>
                </Link>
                <CardContent className="p-4">
                  <Link to={`/product/${item.product._id}`}>
                    <h3 className="font-semibold mb-2 hover:text-primary transition-colors line-clamp-2">
                      {item.product.name}
                    </h3>
                  </Link>
                  <p className="text-2xl font-bold text-primary mb-4">
                    ₦{item.product.price.toLocaleString()}
                  </p>
                  
                  <div className="flex gap-2">
                    <Button
                      onClick={() => addToCart(item.product)}
                      className="flex-1"
                      disabled={!item.product.isActive || item.product.stockQuantity === 0}
                    >
                      <ShoppingCart className="w-4 h-4 mr-2" />
                      {item.product.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </Button>
                    <Button
                      onClick={() => removeFromWishlist(item.product._id)}
                      variant="outline"
                      size="icon"
                      title="Remove from wishlist"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                  
                  {item.product.stockQuantity === 0 && (
                    <p className="text-sm text-destructive mt-2">Out of stock</p>
                  )}
                  {!item.product.isActive && (
                    <p className="text-sm text-muted-foreground mt-2">No longer available</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}