import { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { ShoppingCart, Search, User, LogOut, Package, Heart, Menu, X } from 'lucide-react';
import api from '../../services/api';
import { useToast } from '@/hooks/use-toast';

interface HeaderProps {
  cartItemCount?: number;
}

interface UserData {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  phone?: string;
  address?: string;
  avatarUrl?: string;
}

export const Header = ({ cartItemCount = 0 }: HeaderProps) => {
  const [user, setUser] = useState<UserData | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileSearchOpen, setMobileSearchOpen] = useState(false);
  const navigate = useNavigate();
  const location = useLocation(); // ✅ DETECT ROUTE CHANGES
  const { toast } = useToast();

  // ✅ FIX: REFETCH USER ON ROUTE CHANGES (AFTER LOGIN/REGISTER)
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const token = localStorage.getItem('token');
        if (token) {
          const response = await api.getCurrentUser();
          if (response.success) {
            setUser(response.data);
          }
        } else {
          setUser(null); // Clear user if no token
        }
      } catch (error) {
        console.error('Error fetching user:', error);
        // Clear invalid token
        localStorage.removeItem('token');
        api.setToken(null);
        setUser(null);
      }
    };

    getCurrentUser();
  }, [location.pathname]); // ✅ RE-RUN WHEN ROUTE CHANGES

  // ✅ ALSO LISTEN FOR CUSTOM AUTH EVENTS
  useEffect(() => {
    const handleAuthChange = () => {
      const token = localStorage.getItem('token');
      if (token) {
        api.getCurrentUser()
          .then(response => {
            if (response.success) {
              setUser(response.data);
            }
          })
          .catch(() => {
            setUser(null);
          });
      } else {
        setUser(null);
      }
    };

    // ✅ LISTEN FOR LOGIN/LOGOUT EVENTS
    window.addEventListener('auth-change', handleAuthChange);
    
    return () => {
      window.removeEventListener('auth-change', handleAuthChange);
    };
  }, []);

  const handleSignOut = async () => {
    try {
      await api.logout();
      setUser(null);
      setMobileMenuOpen(false);
      
      // ✅ DISPATCH AUTH CHANGE EVENT
      window.dispatchEvent(new Event('auth-change'));
      
      toast({
        title: "Signed out successfully",
        description: "You have been logged out of your account.",
      });
      navigate('/');
    } catch (error) {
      console.error('Logout error:', error);
      toast({
        title: "Error",
        description: "Failed to sign out. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      navigate(`/shop?search=${encodeURIComponent(searchQuery)}`);
      setMobileSearchOpen(false);
    }
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between gap-4">
          {/* Logo */}
          <Link 
            to="/" 
            className="flex items-center space-x-2 font-bold text-lg sm:text-xl text-primary hover:opacity-80 transition-opacity flex-shrink-0"
          >
            <Package className="h-6 w-6 sm:h-8 sm:w-8" />
            <span className="xs:inline">TradeSphere</span>
          </Link>

          {/* Desktop Search Bar */}
          <form onSubmit={handleSearch} className="hidden lg:flex items-center space-x-2 flex-1 max-w-md mx-8">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                type="text"
                placeholder="Search products..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <Button type="submit" size="sm">Search</Button>
          </form>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center space-x-2">
            <Link to="/shop">
              <Button variant="ghost" size="sm">
                Shop
              </Button>
            </Link>

            {user ? (
              <>
                {/* Cart */}
                <Link to="/cart" className="relative">
                  <Button variant="ghost" size="sm" className="relative">
                    <ShoppingCart className="h-5 w-5" />
                    {cartItemCount > 0 && (
                      <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                        {cartItemCount}
                      </Badge>
                    )}
                  </Button>
                </Link>

                {/* User Menu */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm">
                      <User className="h-5 w-5" />
                      <span className="hidden lg:inline-block ml-2 max-w-[100px] truncate">
                        {user.fullName || 'Account'}
                      </span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48">
                    <DropdownMenuItem asChild>
                      <Link to="/profile" className="cursor-pointer">
                        <User className="mr-2 h-4 w-4" />
                        Profile
                      </Link>
                    </DropdownMenuItem>
                    
                    <DropdownMenuItem asChild>
                      <Link to="/orders" className="cursor-pointer">
                        <Package className="mr-2 h-4 w-4" />
                        My Orders
                      </Link>
                    </DropdownMenuItem>

                    <DropdownMenuItem asChild>
                      <Link to="/wishlist" className="cursor-pointer">
                        <Heart className="mr-2 h-4 w-4" />
                        Wishlist
                      </Link>
                    </DropdownMenuItem>

                    {user.role === 'vendor' && (
                      <>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem asChild>
                          <Link to="/vendor/dashboard" className="cursor-pointer">
                            <Package className="mr-2 h-4 w-4" />
                            Vendor Dashboard
                          </Link>
                        </DropdownMenuItem>
                      </>
                    )}

                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={handleSignOut} className="cursor-pointer">
                      <LogOut className="mr-2 h-4 w-4" />
                      Sign Out
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </>
            ) : (
              <div className="flex items-center space-x-2">
                <Button variant="ghost" size="sm" asChild>
                  <Link to="/auth">Sign In</Link>
                </Button>
                <Button variant="default" size="sm" asChild>
                  <Link to="/auth">Sign Up</Link>
                </Button>
              </div>
            )}
          </nav>

          {/* Mobile Actions */}
          <div className="flex md:hidden items-center gap-2">
            {/* Mobile Search Toggle */}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setMobileSearchOpen(!mobileSearchOpen)}
              className="lg:hidden"
            >
              <Search className="h-5 w-5" />
            </Button>

            {/* Mobile Cart */}
            {user && (
              <Link to="/cart" className="relative">
                <Button variant="ghost" size="sm" className="relative">
                  <ShoppingCart className="h-5 w-5" />
                  {cartItemCount > 0 && (
                    <Badge className="absolute -top-2 -right-2 h-5 w-5 flex items-center justify-center p-0 text-xs">
                      {cartItemCount}
                    </Badge>
                  )}
                </Button>
              </Link>
            )}

            {/* Mobile Menu */}
            <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="sm">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-[280px] sm:w-[350px]">
                <SheetHeader>
                  <SheetTitle className="text-left">
                    {user ? `Hello, ${user.fullName}` : 'Menu'}
                  </SheetTitle>
                </SheetHeader>
                <div className="flex flex-col space-y-4 mt-8">
                  <Link to="/shop" onClick={closeMobileMenu}>
                    <Button variant="ghost" className="w-full justify-start" size="lg">
                      <Package className="mr-2 h-5 w-5" />
                      Shop
                    </Button>
                  </Link>

                  {user ? (
                    <>
                      <Link to="/profile" onClick={closeMobileMenu}>
                        <Button variant="ghost" className="w-full justify-start" size="lg">
                          <User className="mr-2 h-5 w-5" />
                          Profile
                        </Button>
                      </Link>

                      <Link to="/orders" onClick={closeMobileMenu}>
                        <Button variant="ghost" className="w-full justify-start" size="lg">
                          <Package className="mr-2 h-5 w-5" />
                          My Orders
                        </Button>
                      </Link>

                      <Link to="/wishlist" onClick={closeMobileMenu}>
                        <Button variant="ghost" className="w-full justify-start" size="lg">
                          <Heart className="mr-2 h-5 w-5" />
                          Wishlist
                        </Button>
                      </Link>

                      {user.role === 'vendor' && (
                        <>
                          <div className="border-t pt-4">
                            <Link to="/vendor/dashboard" onClick={closeMobileMenu}>
                              <Button variant="ghost" className="w-full justify-start" size="lg">
                                <Package className="mr-2 h-5 w-5" />
                                Vendor Dashboard
                              </Button>
                            </Link>
                          </div>
                        </>
                      )}

                      <div className="border-t pt-4">
                        <Button 
                          variant="ghost" 
                          className="w-full justify-start text-destructive hover:text-destructive" 
                          size="lg"
                          onClick={handleSignOut}
                        >
                          <LogOut className="mr-2 h-5 w-5" />
                          Sign Out
                        </Button>
                      </div>
                    </>
                  ) : (
                    <>
                      <Link to="/auth" onClick={closeMobileMenu}>
                        <Button variant="default" className="w-full" size="lg">
                          Sign In
                        </Button>
                      </Link>
                      <Link to="/auth" onClick={closeMobileMenu}>
                        <Button variant="outline" className="w-full" size="lg">
                          Sign Up
                        </Button>
                      </Link>
                    </>
                  )}
                </div>
              </SheetContent>
            </Sheet>
          </div>
        </div>

        {/* Mobile Search Bar */}
        {mobileSearchOpen && (
          <div className="lg:hidden py-3 border-t">
            <form onSubmit={handleSearch} className="flex items-center space-x-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  type="text"
                  placeholder="Search products..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  autoFocus
                />
              </div>
              <Button type="submit" size="sm">Search</Button>
              <Button 
                type="button" 
                variant="ghost" 
                size="sm"
                onClick={() => setMobileSearchOpen(false)}
              >
                <X className="h-4 w-4" />
              </Button>
            </form>
          </div>
        )}
      </div>
    </header>
  );
};