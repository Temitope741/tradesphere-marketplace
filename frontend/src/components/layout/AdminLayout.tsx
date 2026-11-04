import { ReactNode, useEffect, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, ShoppingCart, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import api from '@/services/api';

const navItems = [
  { to: '/admin/dashboard', label: 'Overview', icon: LayoutDashboard },
  { to: '/admin/users', label: 'Users', icon: Users },
  { to: '/admin/orders', label: 'Orders & Disputes', icon: ShoppingCart },
];

// Wraps every admin page. Besides the layout, it checks the signed-in user is
// an admin and sends everyone else away. (The real protection is on the
// server — every /api/admin route rejects non-admins — this just avoids
// showing a broken page to the wrong person.)
export function AdminLayout({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [allowed, setAllowed] = useState(false);

  useEffect(() => {
    const check = async () => {
      if (!localStorage.getItem('token')) {
        navigate('/auth');
        return;
      }
      try {
        const response = await api.getCurrentUser();
        if (response.success && response.data?.role === 'admin') {
          setAllowed(true);
        } else {
          navigate('/');
        }
      } catch {
        navigate('/auth');
      }
    };
    check();
  }, [navigate]);

  if (!allowed) {
    return (
      <div className="flex items-center justify-center py-24">
        <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-4rem)] bg-muted/30">
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          <aside className="lg:w-56 flex-shrink-0">
            <div className="flex items-center gap-2 mb-6 px-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              <span className="font-display font-semibold text-sm tracking-tight">
                Admin Console
              </span>
            </div>
            <nav className="flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible">
              {navItems.map(({ to, label, icon: Icon }) => (
                <NavLink
                  key={to}
                  to={to}
                  className={({ isActive }) =>
                    cn(
                      'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium whitespace-nowrap transition-colors',
                      isActive
                        ? 'bg-primary text-primary-foreground shadow-button'
                        : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                    )
                  }
                >
                  <Icon className="h-4 w-4" />
                  {label}
                </NavLink>
              ))}
            </nav>
          </aside>

          <div className="flex-1 min-w-0">{children}</div>
        </div>
      </div>
    </div>
  );
}