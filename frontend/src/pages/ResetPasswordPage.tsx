import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Eye, EyeOff, Package } from 'lucide-react';
import api from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface ResetResponse {
  success: boolean;
  token?: string;
  user?: { role: string };
  message?: string;
}

export default function ResetPasswordPage() {
  const { token } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [linkProblem, setLinkProblem] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLinkProblem(false);

    if (password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirmPassword) {
      setError('The two passwords do not match.');
      return;
    }
    if (!token) {
      setLinkProblem(true);
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.request<ResetResponse>(
        `/auth/reset-password/${encodeURIComponent(token)}`,
        {
          method: 'PUT',
          body: JSON.stringify({ password }),
        }
      );

      // The server signs the user in after a successful reset.
      if (response.token) {
        api.setToken(response.token);
        window.dispatchEvent(new Event('auth-change'));
      }

      toast({
        title: 'Password updated',
        description: 'Your password was changed and you are now signed in.',
      });

      const role = response.user?.role;
      if (role === 'vendor') {
        navigate('/vendor/dashboard');
      } else if (role === 'admin') {
        navigate('/admin/dashboard');
      } else {
        navigate('/');
      }
    } catch (err: any) {
      const message: string = err.message || '';
      if (message.toLowerCase().includes('invalid or expired')) {
        setLinkProblem(true);
      } else {
        setError(message || 'Something went wrong. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-subtle px-4 py-12">
      <Card className="w-full max-w-md shadow-elegant">
        <CardHeader className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-2">
            <Package className="h-8 w-8 text-primary" />
            <span className="font-bold text-2xl">TradeSphere</span>
          </div>
          <div>
            <CardTitle className="text-2xl">Choose a new password</CardTitle>
            <CardDescription>Enter a new password for your account.</CardDescription>
          </div>
        </CardHeader>

        <CardContent>
          {linkProblem ? (
            <div className="space-y-6 text-center">
              <Alert variant="destructive">
                <AlertDescription>
                  This reset link is invalid or has expired. Reset links only work once and for 10
                  minutes.
                </AlertDescription>
              </Alert>
              <Button asChild className="w-full">
                <Link to="/forgot-password">Request a new link</Link>
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              {error && (
                <Alert variant="destructive">
                  <AlertDescription>{error}</AlertDescription>
                </Alert>
              )}

              <div className="space-y-2">
                <Label htmlFor="reset-password">New password</Label>
                <div className="relative">
                  <Input
                    id="reset-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder="At least 6 characters"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    disabled={isLoading}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                    onClick={() => setShowPassword(!showPassword)}
                    disabled={isLoading}
                  >
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="reset-confirm">Confirm new password</Label>
                <Input
                  id="reset-confirm"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="Type it again"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                  disabled={isLoading}
                />
              </div>

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Updating...' : 'Update password'}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  );
}