import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ShoppingCart, Heart } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  imageUrl: string;
  vendor: {
    fullName: string;
  };
  category: {
    _id: string;
    name: string;
  };
  averageRating: number;
}

interface Category {
  _id: string;
  name: string;
  slug: string;
}

export default function ShopPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [loading, setLoading] = useState(true);
  const [wishlistIds, setWishlistIds] = useState<Set<string>>(new Set());
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    fetchCategories();
    fetchWishlist();
  }, []);

  useEffect(() => {
    fetchProducts();
  }, [selectedCategory, searchQuery]);

  const fetchCategories = async () => {
    try {
      const response = await api.getCategories();
      if (response.success) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const params: any = {};
      
      if (selectedCategory !== 'all') {
        params.category = selectedCategory;
      }
      
      if (searchQuery.trim()) {
        params.search = searchQuery;
      }

      const response = await api.getProducts(params);
      if (response.success) {
        setProducts(response.data);
      }
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load products.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchWishlist = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await api.getWishlist();
      if (response.success) {
        const ids = new Set<string>(
          (response.data.items || []).map((item: any) => item.product._id)
        );
        setWishlistIds(ids);
      }
    } catch (error) {
      console.error('Error fetching wishlist:', error);
    }
  };

  const toggleWishlist = async (e: React.MouseEvent, productId: string) => {
    e.preventDefault();
    e.stopPropagation();

    const token = localStorage.getItem('token');
    if (!token) {
      toast({
        title: "Authentication required",
        description: "Please sign in to manage your wishlist.",
        variant: "destructive",
      });
      navigate('/auth');
      return;
    }

    try {
      const isSaved = wishlistIds.has(productId);
      const response = isSaved
        ? await api.removeFromWishlist(productId)
        : await api.addToWishlist(productId);

      if (response.success) {
        setWishlistIds((prev) => {
          const next = new Set(prev);
          isSaved ? next.delete(productId) : next.add(productId);
          return next;
        });
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update wishlist.",
        variant: "destructive",
      });
    }
  };


  return (
    <div className="min-h-screen bg-[#f2ede6]">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold mb-2 text-stone-800">Shop</h1>
          <p className="text-stone-500">Discover amazing products from our vendors</p>
        </div>

        {/* Filters */}
        <div className="flex flex-col md:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
            <Input
              type="text"
              placeholder="Search products..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10 bg-white"
            />
          </div>
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-full md:w-[200px] bg-white">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Categories</SelectItem>
              {categories.map((cat) => (
                <SelectItem key={cat._id} value={cat._id}>
                  {cat.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Products Grid */}
        {loading ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="animate-pulse">
                <div className="aspect-[4/5] bg-stone-200 rounded-sm" />
                <div className="h-3 bg-stone-200 rounded w-1/3 mt-4" />
                <div className="h-4 bg-stone-200 rounded w-2/3 mt-2" />
                <div className="h-3 bg-stone-200 rounded w-full mt-2" />
              </div>
            ))}
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-16">
            <ShoppingCart className="h-24 w-24 text-stone-300 mx-auto mb-4" />
            <p className="text-stone-500 text-lg mb-2">No products found</p>
            <p className="text-sm text-stone-400 mb-4">
              Try adjusting your search or filters
            </p>
            <Button variant="outline" onClick={() => {
              setSearchQuery('');
              setSelectedCategory('all');
            }}>
              Clear Filters
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-x-8 gap-y-12">
            {products.map((product) => {
              const isSignature = (product.averageRating || 0) >= 4.5;
              const isSaved = wishlistIds.has(product._id);

              return (
                <Link
                  to={`/product/${product._id}`}
                  key={product._id}
                  className="group block"
                >
                  {/* Image */}
                  <div className="relative aspect-[4/5] overflow-hidden bg-stone-100 rounded-sm">
                    {product.imageUrl ? (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <ShoppingCart className="h-10 w-10 text-stone-300" />
                      </div>
                    )}

                    {/* Top-left status pill */}
                    {(isSignature || product.stockQuantity === 0 || (product.stockQuantity > 0 && product.stockQuantity < 10)) && (
                      <span className="absolute top-4 left-4 px-3 py-1 text-[10px] uppercase tracking-wider italic font-editorial border border-stone-400/60 bg-white/70 text-stone-600 rounded-sm">
                        {isSignature
                          ? 'Signature'
                          : product.stockQuantity === 0
                            ? 'Sold Out'
                            : 'Few Left'}
                      </span>
                    )}

                    {/* Wishlist heart */}
                    <button
                      onClick={(e) => toggleWishlist(e, product._id)}
                      className="absolute top-4 right-4 h-8 w-8 rounded-full bg-white/80 flex items-center justify-center hover:bg-white transition-colors"
                    >
                      <Heart className={`h-4 w-4 ${isSaved ? 'fill-stone-700 text-stone-700' : 'text-stone-500'}`} />
                    </button>

                    {/* View Details — revealed on hover */}
                    <div className="absolute bottom-0 left-0 right-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300">
                      <div className="bg-white/95 text-center py-3 text-xs uppercase tracking-[0.15em] font-medium text-stone-800">
                        View Details
                      </div>
                    </div>
                  </div>

                  {/* Details below the image */}
                  <div className="mt-4">
                    <p className="text-[11px] uppercase tracking-wider text-amber-700/70 mb-1">
                      {product.category?.name || 'Uncategorized'}
                    </p>
                    <h3
                      className={`font-editorial italic text-2xl leading-snug mb-1 ${
                        isSignature ? 'text-amber-800' : 'text-stone-800'
                      }`}
                    >
                      {product.name}
                    </h3>
                    <p className="text-sm text-stone-500 line-clamp-1 mb-2">
                      {product.description}
                    </p>
                    <p className="text-sm text-stone-700">
                      <span className="font-semibold">₦{product.price.toLocaleString()}</span>
                      <span className="text-stone-400"> | </span>
                      <span className="text-stone-400">
                        by {product.vendor?.fullName || 'Unknown Vendor'}
                      </span>
                    </p>
                  </div>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}