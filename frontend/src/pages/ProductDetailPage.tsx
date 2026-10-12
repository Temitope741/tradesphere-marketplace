import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '@/services/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Textarea } from '@/components/ui/textarea';
import { ShoppingCart, Heart, Star, Package, ArrowLeft } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  stockQuantity: number;
  imageUrl: string;
  images?: string[];
  sku?: string;
  vendor: {
    fullName: string;
    email: string;
  };
  category: {
    name: string;
  };
  averageRating: number;
  totalReviews: number;
}

interface Review {
  _id: string;
  user: {
    fullName: string;
  };
  rating: number;
  comment: string;
  createdAt: string;
}

export default function ProductDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [quantity, setQuantity] = useState(1);
  const [newReview, setNewReview] = useState({ rating: 5, comment: '' });
  const [loading, setLoading] = useState(true);
  const [isInWishlist, setIsInWishlist] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const { toast } = useToast();

  // Falls back to the single imageUrl for older products saved before
  // multi-image support existed, so nothing breaks for them.
  const galleryImages = product?.images?.length
    ? product.images
    : product?.imageUrl
      ? [product.imageUrl]
      : [];
  const activeImage = galleryImages[selectedImageIndex] || galleryImages[0] || '';

  useEffect(() => {
    if (id) {
      fetchProduct();
      fetchReviews();
      checkWishlist();
    }
  }, [id]);

  const fetchProduct = async () => {
    try {
      const response = await api.getProduct(id!);
      if (response.success) {
        setProduct(response.data);
        setSelectedImageIndex(0);
      }
    } catch (error) {
      console.error('Error fetching product:', error);
      toast({
        title: "Error",
        description: "Failed to load product details.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchReviews = async () => {
    try {
      const response = await api.getProductReviews(id!);
      if (response.success) {
        setReviews(response.data);
      }
    } catch (error) {
      console.error('Error fetching reviews:', error);
    }
  };

  const checkWishlist = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await api.getWishlist();
      if (response.success) {
        const inWishlist = response.data.items?.some(
          (item: any) => item.product._id === id
        );
        setIsInWishlist(inWishlist);
      }
    } catch (error) {
      console.error('Error checking wishlist:', error);
    }
  };

  const toggleWishlist = async () => {
    try {
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

      if (isInWishlist) {
        const response = await api.removeFromWishlist(id!);
        if (response.success) {
          setIsInWishlist(false);
          toast({
            title: "Removed from wishlist",
            description: "Item has been removed from your wishlist.",
          });
        }
      } else {
        const response = await api.addToWishlist(id!);
        if (response.success) {
          setIsInWishlist(true);
          toast({
            title: "❤️ Added to wishlist!",
            description: "Item has been added to your wishlist.",
            className: "animate-scale-in",
          });
        }
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to update wishlist.",
        variant: "destructive",
      });
    }
  };

  const addToCart = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        toast({
          title: "Authentication required",
          description: "Please sign in to add items to cart.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      const response = await api.addToCart(id!, quantity);
      if (response.success) {
        toast({
          title: "✨ Added to cart!",
          description: `${quantity} item(s) added to your cart.`,
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

  const submitReview = async () => {
    try {
      const token = localStorage.getItem('token');

      if (!token) {
        toast({
          title: "Authentication required",
          description: "Please sign in to leave a review.",
          variant: "destructive",
        });
        navigate('/auth');
        return;
      }

      if (!newReview.comment.trim()) {
        toast({
          title: "Review required",
          description: "Please write a comment for your review.",
          variant: "destructive",
        });
        return;
      }

      const response = await api.createReview({
        productId: id,  // ✅ FIXED
        rating: newReview.rating,
        comment: newReview.comment,
      });

      if (response.success) {
        toast({
          title: "Review submitted",
          description: "Thank you for your feedback!"
        });
        setNewReview({ rating: 5, comment: '' });
        fetchReviews();
        fetchProduct();
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to submit review.",
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

  if (!product) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Product not found</h2>
          <Button onClick={() => navigate('/shop')}>Back to Shop</Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* ── Immersive hero: dark glass panel over a blurred backdrop of the
          product's own photo, echoing the reference design's mood-lit,
          gold-accented configurator card. ── */}
      <section className="relative overflow-hidden bg-neutral-900 text-gray-100">
        {/* Blurred ambient backdrop, built from the currently selected image */}
        {activeImage && (
          <div className="absolute inset-0">
            <img
              src={activeImage}
              alt=""
              aria-hidden="true"
              className="w-full h-full object-cover scale-110 blur-2xl opacity-40"
            />
          </div>
        )}
        <div className="absolute inset-0" />

        <div className="relative z-10 container mx-auto px-4 py-8">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="mb-6 text-white/80 hover:text-white hover:bg-white/10"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>

          <div className="grid grid-cols-1 lg:grid-cols-[1fr_1.1fr_1fr] gap-10 items-center pb-8">
            {/* Left: brand / headline */}
            <div>
              <div className="flex items-center gap-2 text-sm text-amber-200/80 mb-4">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-300" />
                {product.vendor?.fullName || 'Unknown Vendor'}
              </div>
              <h1 className="text-3xl lg:text-4xl font-bold uppercase tracking-tight text-amber-100 leading-tight mb-4">
                {product.name}
              </h1>
              <div className="flex items-center gap-3 flex-wrap">
                <Badge variant="outline" className="border-amber-200/30 text-amber-100 bg-white/5">
                  {product.category?.name || 'Uncategorized'}
                </Badge>
                <div className="flex items-center gap-1 text-sm text-white/70">
                  <Star className="h-4 w-4 fill-amber-300 text-amber-300" />
                  <span>{product.averageRating?.toFixed(1) || '0.0'}</span>
                  <span className="text-white/40">({product.totalReviews || reviews.length})</span>
                </div>
              </div>
            </div>

            {/* Center: floating product image + thumbnail selector */}
            <div className="flex flex-col items-center justify-center gap-5">
              <div className="relative w-full max-w-xs aspect-square">
                {activeImage ? (
                  <img
                    src={activeImage}
                    alt={product.name}
                    className="w-full h-full object-contain drop-shadow-[0_30px_40px_rgba(0,0,0,0.5)]"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center rounded-2xl bg-white/5">
                    <Package className="h-20 w-20 text-white/30" />
                  </div>
                )}
              </div>

              {galleryImages.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap justify-center">
                  {galleryImages.map((img, index) => (
                    <button
                      key={img + index}
                      type="button"
                      onClick={() => setSelectedImageIndex(index)}
                      className={`h-14 w-14 rounded-lg overflow-hidden border-2 transition-colors ${
                        index === selectedImageIndex
                          ? 'border-amber-300'
                          : 'border-white/15 hover:border-white/40'
                      }`}
                    >
                      <img src={img} alt={`${product.name} ${index + 1}`} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Right: glass control panel */}
            <div className="relative rounded-2xl border border-white/10 bg-white/5 backdrop-blur-xl p-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={toggleWishlist}
                className="absolute top-4 right-4 text-white/70 hover:text-amber-200 hover:bg-white/10"
              >
                <Heart className={`h-5 w-5 ${isInWishlist ? 'fill-amber-300 text-amber-300' : ''}`} />
              </Button>

              <div className="space-y-6">
                {/* Quantity, styled like the reference's SIZE selector */}
                <div>
                  <p className="text-xs uppercase tracking-widest text-white/40 mb-2">Quantity</p>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => setQuantity(Math.max(1, quantity - 1))}
                      disabled={quantity <= 1}
                      className="h-9 w-9 rounded-full border border-white/15 flex items-center justify-center text-white/80 hover:border-amber-200/60 hover:text-amber-100 disabled:opacity-30 transition-colors"
                    >
                      −
                    </button>
                    <span className="h-9 w-12 rounded-full border border-amber-200/60 bg-amber-200/10 flex items-center justify-center font-semibold text-amber-100">
                      {quantity}
                    </span>
                    <button
                      onClick={() => setQuantity(Math.min(product.stockQuantity, quantity + 1))}
                      disabled={quantity >= product.stockQuantity}
                      className="h-9 w-9 rounded-full border border-white/15 flex items-center justify-center text-white/80 hover:border-amber-200/60 hover:text-amber-100 disabled:opacity-30 transition-colors"
                    >
                      +
                    </button>
                  </div>
                </div>

                {/* Stock level, styled like the reference's SLEEVE LENGTH slider (read-only) */}
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <p className="text-xs uppercase tracking-widest text-white/40">Stock level</p>
                    <span className="text-xs text-amber-100">
                      {product.stockQuantity > 0 ? `${product.stockQuantity} available` : 'Out of stock'}
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500"
                      style={{ width: `${Math.min(100, (product.stockQuantity / 50) * 100)}%` }}
                    />
                  </div>
                </div>

                {/* Rating, styled like the reference's CHEST slider (read-only) */}
                <div>
                  <div className="flex justify-between items-baseline mb-2">
                    <p className="text-xs uppercase tracking-widest text-white/40">Rating</p>
                    <span className="text-xs text-amber-100">
                      {(product.averageRating || 0).toFixed(1)} / 5
                    </span>
                  </div>
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-gradient-to-r from-amber-300 to-amber-500"
                      style={{ width: `${((product.averageRating || 0) / 5) * 100}%` }}
                    />
                  </div>
                </div>

                <Separator className="bg-white/10" />

                <div className="flex items-center justify-between">
                  <span className="text-2xl font-bold text-amber-100">
                    ₦{product.price.toLocaleString()}
                  </span>
                </div>

                <Button
                  onClick={addToCart}
                  disabled={product.stockQuantity === 0}
                  className="w-full rounded-full bg-amber-200 text-neutral-900 hover:bg-amber-100 font-semibold h-12"
                >
                  <ShoppingCart className="mr-2 h-4 w-4" />
                  {product.stockQuantity === 0 ? 'Out of Stock' : 'Add to Cart'}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Everything below stays in the site's normal light theme ── */}
      <div className="container mx-auto px-4 py-12">
        <div className="max-w-3xl mb-12">
          <h2 className="text-xl font-semibold mb-3">Description</h2>
          <p className="text-muted-foreground leading-relaxed">{product.description}</p>
          {product.sku && (
            <p className="text-sm text-muted-foreground mt-4">
              <span className="font-semibold">SKU:</span> {product.sku}
            </p>
          )}
        </div>

        {/* Reviews Section */}
        <Card>
          <CardContent className="p-6">
            <h2 className="text-2xl font-bold mb-6">Customer Reviews</h2>

            {/* Review Form */}
            <div className="mb-8 p-4 border rounded-lg">
              <h3 className="font-semibold mb-4">Write a Review</h3>
              <div className="flex items-center gap-2 mb-4">
                <span>Rating:</span>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setNewReview({ ...newReview, rating: star })}
                      type="button"
                    >
                      <Star
                        className={`h-6 w-6 ${star <= newReview.rating
                            ? 'fill-yellow-400 text-yellow-400'
                            : 'text-muted-foreground'
                          }`}
                      />
                    </button>
                  ))}
                </div>
              </div>
              <Textarea
                placeholder="Share your experience with this product..."
                value={newReview.comment}
                onChange={(e) => setNewReview({ ...newReview, comment: e.target.value })}
                className="mb-4"
                rows={4}
              />
              <Button onClick={submitReview}>Submit Review</Button>
            </div>

            {/* Reviews List */}
            <div className="space-y-6">
              {reviews.length === 0 ? (
                <p className="text-muted-foreground text-center py-8">
                  No reviews yet. Be the first to review this product!
                </p>
              ) : (
                reviews.map((review) => (
                  <div key={review._id} className="border-b pb-4 last:border-0">
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-semibold">
                        {review.user?.fullName || 'Anonymous'}
                      </span>
                      <div className="flex items-center">
                        {[...Array(5)].map((_, i) => (
                          <Star
                            key={i}
                            className={`h-4 w-4 ${i < review.rating
                                ? 'fill-yellow-400 text-yellow-400'
                                : 'text-muted-foreground'
                              }`}
                          />
                        ))}
                      </div>
                    </div>
                    <p className="text-muted-foreground text-sm mb-2">
                      {new Date(review.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                      })}
                    </p>
                    <p>{review.comment}</p>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}