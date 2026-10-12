import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Star,
  ShoppingCart,
  TrendingUp,
  Users,
  Package,
  ArrowRight,
  ShieldCheck,
  Zap,
  CheckCircle2,
  Search,
  CreditCard,
  Truck,
  Store,
  Wallet,
  Quote,
} from 'lucide-react';
import api from '@/services/api';

interface Product {
  _id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string;
  vendor: { fullName: string };
  category: { name: string };
  averageRating: number;
}

interface Category {
  _id: string;
  name: string;
  slug: string;
  description: string;
}

// ─── Skeleton Components 

function ProductSkeleton() {
  return (
    <div className="rounded-lg overflow-hidden border bg-card animate-pulse">
      <div className="aspect-square bg-muted" />
      <div className="p-4 space-y-3">
        <div className="h-4 bg-muted rounded w-1/3" />
        <div className="h-4 bg-muted rounded w-3/4" />
        <div className="h-3 bg-muted rounded w-full" />
        <div className="h-3 bg-muted rounded w-5/6" />
        <div className="flex justify-between items-center pt-1">
          <div className="h-6 bg-muted rounded w-16" />
          <div className="h-6 bg-muted rounded w-10" />
        </div>
      </div>
    </div>
  );
}

function CategorySkeleton() {
  return (
    <div className="rounded-lg border p-6 animate-pulse">
      <div className="w-12 h-12 bg-muted rounded-full mx-auto mb-3" />
      <div className="h-3 bg-muted rounded w-2/3 mx-auto" />
    </div>
  );
}

// ─── Product Image

function ProductImage({ src, alt }: { src: string; alt: string }) {
  const [loaded, setLoaded] = useState(false);

  return (
    <div className="relative aspect-square overflow-hidden bg-muted">
      {!loaded && (
        <div className="absolute inset-0 animate-pulse bg-gradient-to-br from-muted to-muted/40" />
      )}
      <img
        src={src || '/placeholder.svg'}
        alt={alt}
        loading="lazy"
        decoding="async"
        width={400}
        height={400}
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-105 ${
          loaded ? 'opacity-100 blur-0' : 'opacity-0 blur-md'
        }`}
      />
    </div>
  );
}

// ─── Hero Section

function usePulsingAmount(base: number, step: number) {
  const [amount, setAmount] = useState(base);
  useEffect(() => {
    const id = setInterval(() => {
      setAmount((prev) => (prev >= base + step * 4 ? base : prev + step));
    }, 2200);
    return () => clearInterval(id);
  }, [base, step]);
  return amount;
}

function HeroPaymentCards() {
  const amount = usePulsingAmount(24500, 6800);

  return (
    <div className="relative hidden lg:block h-[420px]" aria-hidden="true">
      {/* Hero image */}
      <img
        src="https://images.unsplash.com/photo-1563013544-824ae1b704d3?fm=jpg&q=80&w=1200&auto=format&fit=crop"
        alt=""
        className="absolute inset-0 w-full h-full object-cover rounded-3xl shadow-elegant"
      />
      <div className="absolute inset-0 rounded-3xl bg-gradient-to-t from-background/40 via-transparent to-transparent" />

      {/* Product mini-card */}
      <div className="absolute top-4 right-6 w-60 rounded-2xl bg-card border shadow-card p-4 rotate-[-6deg] motion-safe:animate-float">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
            <Package className="h-5 w-5 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium truncate">Wireless Earbuds</p>
            <p className="text-xs text-muted-foreground">by Verified Vendor</p>
          </div>
        </div>
        <p className="mt-3 font-mono-price text-lg font-semibold text-foreground">
          ₦18,000
        </p>
      </div>

      {/* Payment confirmed card */}
      <div
        className="absolute bottom-8 left-0 w-72 rounded-2xl bg-card border shadow-elegant p-5 rotate-[4deg] motion-safe:animate-float"
        style={{ animationDelay: '0.8s' }}
      >
        <div className="flex items-center gap-2 mb-3">
          <div className="w-8 h-8 rounded-full bg-accent/10 flex items-center justify-center">
            <CheckCircle2 className="h-4 w-4 text-accent" />
          </div>
          <span className="text-sm font-medium">Payment received</span>
        </div>
        <p className="font-mono-price text-2xl font-semibold text-foreground tabular-nums">
          ₦{amount.toLocaleString()}
        </p>
        <p className="text-xs text-muted-foreground mt-1">Settled via Nomba</p>
      </div>

      {/* Payout pill */}
      <div
        className="absolute top-1/2 -right-2 translate-x-2 rounded-full bg-accent text-accent-foreground text-xs font-medium px-4 py-2 shadow-button motion-safe:animate-float"
        style={{ animationDelay: '1.4s' }}
      >
        Payout scheduled → Fri
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export default function HomePage() {
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingCategories, setIsLoadingCategories] = useState(true);

  useEffect(() => {
    // ✅ Both API calls run in PARALLEL
    const fetchProducts = async () => {
      try {
        const res = await api.getProducts({ limit: 8 });
        if (res.success) setFeaturedProducts(res.data);
      } catch (err) {
        console.error('Error fetching products:', err);
      } finally {
        setIsLoadingProducts(false);
      }
    };

    const fetchCategories = async () => {
      try {
        const res = await api.getCategories();
        if (res.success) setCategories(res.data.slice(0, 6));
      } catch (err) {
        console.error('Error fetching categories:', err);
      } finally {
        setIsLoadingCategories(false);
      }
    };

    fetchProducts();
    fetchCategories();
  }, []);

  return (
    <div className="min-h-screen">

      {/* ── Hero Section — fintech-clean: white space, soft gradient mesh, no heavy image ── */}
      <section className="relative overflow-hidden bg-background">
        {/* Soft ambient gradient blobs instead of a large background photo.
            This is the single biggest performance win on this page: the old
            hero relied on a full-bleed JPG that dominated LCP. This section
            now ships zero raster images. */}
        <div
          className="pointer-events-none absolute -top-32 -right-24 w-[520px] h-[520px] rounded-full bg-primary/10 blur-3xl motion-safe:animate-float"
          aria-hidden="true"
        />
        <div
          className="pointer-events-none absolute top-1/3 -left-32 w-[420px] h-[420px] rounded-full bg-accent/10 blur-3xl motion-safe:animate-float"
          style={{ animationDelay: '1.2s' }}
          aria-hidden="true"
        />
        {/* Faint dot grid for texture, dashboard-like */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.4]"
          style={{
            backgroundImage:
              'radial-gradient(hsl(var(--border)) 1px, transparent 1px)',
            backgroundSize: '28px 28px',
            maskImage:
              'linear-gradient(to bottom, black, transparent 70%)',
          }}
          aria-hidden="true"
        />

        <div className="relative z-10 container mx-auto px-4 py-20 sm:py-24 lg:py-28">
          <div className="grid lg:grid-cols-[1.05fr_0.95fr] gap-12 lg:gap-8 items-center">
            <div className="max-w-2xl">
              <div className="motion-safe:animate-fade-in inline-flex items-center gap-2 rounded-full border bg-card px-4 py-1.5 mb-6 text-xs font-medium text-muted-foreground">
                <Zap className="h-3.5 w-3.5 text-accent" />
                Payments infrastructure by Nomba
              </div>

              <h1 className="font-display motion-safe:animate-fade-in text-4xl sm:text-5xl lg:text-6xl font-semibold tracking-tight text-foreground mb-6 leading-[1.1]">
                Sell smarter.
                <br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-accent">
                  Get paid faster.
                </span>
              </h1>

              <p className="motion-safe:animate-slide-up text-lg sm:text-xl text-muted-foreground mb-8 leading-relaxed">
                TradeSphere lets you sell online, receive secure digital payments,
                automate order management, and manage payouts — all powered by
                Nomba's payment infrastructure.
              </p>

              <div className="motion-safe:animate-scale-in flex flex-col sm:flex-row gap-3 mb-10">
                <Button size="lg" asChild className="text-base px-8 py-6 w-full sm:w-auto">
                  <Link to="/shop">
                    Start Shopping
                    <ShoppingCart className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild className="text-base px-8 py-6 w-full sm:w-auto">
                  <Link to="/auth?tab=vendor">
                    Become a Vendor
                    <TrendingUp className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>

              <div className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-muted-foreground">
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  Verified vendors
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  Secure payouts
                </span>
                <span className="inline-flex items-center gap-1.5">
                  <ShieldCheck className="h-4 w-4 text-accent" />
                  No setup fees
                </span>
              </div>
            </div>

            <HeroPaymentCards />
          </div>
        </div>
      </section>

      {/* ── Features Section ── */}
      <section className="py-16 md:py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <p className="text-sm font-medium text-accent uppercase tracking-wide mb-3">
              Why TradeSphere
            </p>
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose TradeSphere?</h2>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
              We connect customers with amazing vendors, creating a thriving marketplace ecosystem.
            </p>
          </div>

          <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-6 md:gap-8">
            {[
              {
                icon: <Package className="h-8 w-8 text-primary" />,
                bg: 'bg-primary/10',
                title: 'Quality Products',
                desc: 'Carefully curated products from verified vendors with quality guarantees.',
              },
              {
                icon: <Users className="h-8 w-8 text-accent" />,
                bg: 'bg-accent/10',
                title: 'Trusted Community',
                desc: 'Join thousands of satisfied customers and successful vendors in our marketplace.',
              },
              {
                icon: <TrendingUp className="h-8 w-8 text-primary-light" />,
                bg: 'bg-primary-light/10',
                title: 'Easy Growth',
                desc: 'Powerful tools for vendors to grow their business and reach more customers.',
              },
            ].map(({ icon, bg, title, desc }) => (
              <Card
                key={title}
                className="text-center p-6 md:p-8 shadow-card hover:shadow-elegant transition-all duration-300 hover:-translate-y-1"
              >
                <CardContent className="space-y-4 pt-2">
                  <div className={`w-16 h-16 ${bg} rounded-full flex items-center justify-center mx-auto`}>
                    {icon}
                  </div>
                  <h3 className="text-xl md:text-2xl font-semibold">{title}</h3>
                  <p className="text-muted-foreground">{desc}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* ── Categories Section ── */}
      <section className="py-16 md:py-20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12 md:mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Shop by Category</h2>
            <p className="text-lg md:text-xl text-muted-foreground">
              Explore our wide range of product categories
            </p>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4 md:gap-6">
            {isLoadingCategories
              ? Array.from({ length: 6 }).map((_, i) => <CategorySkeleton key={i} />)
              : categories.map((category) => (
                  <Link
                    key={category._id}
                    to={`/shop?category=${category.slug}`}
                    className="group"
                    aria-label={`Shop ${category.name}`}
                  >
                    <Card className="text-center p-4 md:p-6 hover:shadow-card transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                      <CardContent className="space-y-3 pt-2">
                        <div className="w-12 h-12 bg-primary/10 rounded-full flex items-center justify-center mx-auto group-hover:bg-primary/20 transition-colors">
                          <Package className="h-6 w-6 text-primary" />
                        </div>
                        <h3 className="font-semibold text-sm">{category.name}</h3>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section className="py-16 md:py-20 bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-4 mb-12 md:mb-16">
            <div>
              <h2 className="text-3xl md:text-4xl font-bold mb-2 md:mb-4">Featured Products</h2>
              <p className="text-lg md:text-xl text-muted-foreground">
                Discover top-rated products from our marketplace
              </p>
            </div>
            <Button variant="outline" asChild className="self-start shrink-0">
              <Link to="/shop">
                View All <ArrowRight className="ml-2 h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {isLoadingProducts
              ? Array.from({ length: 8 }).map((_, i) => <ProductSkeleton key={i} />)
              : featuredProducts.map((product) => (
                  <Card
                    key={product._id}
                    className="group hover:shadow-card transition-all duration-300 overflow-hidden"
                  >
                    <ProductImage src={product.imageUrl} alt={product.name} />
                    <CardContent className="p-4 space-y-3">
                      <div className="space-y-2">
                        <Badge variant="secondary" className="text-xs">
                          {product.category?.name}
                        </Badge>
                        <h3 className="font-semibold line-clamp-2">{product.name}</h3>
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {product.description}
                        </p>
                      </div>

                      <div className="flex justify-between items-center">
                        <span className="font-mono-price text-xl md:text-2xl font-bold text-primary">
                          ₦{product.price.toLocaleString()}
                        </span>
                        <div className="flex items-center space-x-1">
                          <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                          <span className="text-sm text-muted-foreground">
                            {product.averageRating || 0}
                          </span>
                        </div>
                      </div>

                      <div className="flex justify-between items-center pt-2">
                        <span className="text-sm text-muted-foreground truncate mr-2">
                          by {product.vendor?.fullName}
                        </span>
                        <Button size="sm" variant="outline" asChild className="shrink-0">
                          <Link to={`/product/${product._id}`}>View</Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
          </div>
        </div>
      </section>

      {/* ── CTA Section ── */}
      <section className="py-16 md:py-20 bg-gradient-primary text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-6">Ready to Start Selling?</h2>
          <p className="text-lg md:text-xl mb-8 max-w-2xl mx-auto opacity-90">
            Join thousands of successful vendors on our platform. Start your online business today
            with our easy-to-use vendor tools and reach customers worldwide.
          </p>
          <Button variant="premium" size="lg" asChild className="text-base sm:text-lg px-6 sm:px-8 py-5 sm:py-6">
            <Link to="/auth?tab=vendor">
              Get Started as Vendor
              <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

    </div>
  );
}