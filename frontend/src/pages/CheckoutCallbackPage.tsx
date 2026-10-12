import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '@/services/api';
import { CheckCircle, XCircle, Loader2 } from 'lucide-react';

type Status = 'checking' | 'paid' | 'pending';

export default function CheckoutCallbackPage() {
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState<Status>('checking');
  const navigate = useNavigate();

  useEffect(() => {
    const reference = searchParams.get('ref') || searchParams.get('orderReference');

    if (!reference) {
      navigate('/orders');
      return;
    }

    let cancelled = false;
    let attempts = 0;
    const maxAttempts = 6; // ~18s of polling, 3s apart

    const poll = async () => {
      attempts += 1;

      try {
        const res: any = await api.verifyPayment(reference);

        if (cancelled) return;

        if (res.success && res.data?.paid) {
          setStatus('paid');
          setTimeout(() => navigate('/orders'), 1500);
          return;
        }
      } catch (err) {
        console.error('Verify payment poll error:', err);
      }

      if (!cancelled) {
        if (attempts < maxAttempts) {
          setTimeout(poll, 3000);
        } else {
          setStatus('pending');
        }
      }
    };

    poll();

    return () => {
      cancelled = true;
    };
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center px-4">
      <div className="text-center max-w-sm">
        {status === 'checking' && (
          <>
            <Loader2 className="h-10 w-10 animate-spin text-primary mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Confirming your payment...</h1>
            <p className="text-muted-foreground text-sm">This usually takes a few seconds.</p>
          </>
        )}

        {status === 'paid' && (
          <>
            <CheckCircle className="h-10 w-10 text-accent mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Payment confirmed!</h1>
            <p className="text-muted-foreground text-sm">Redirecting to your orders...</p>
          </>
        )}

        {status === 'pending' && (
          <>
            <XCircle className="h-10 w-10 text-muted-foreground mx-auto mb-4" />
            <h1 className="text-xl font-semibold mb-2">Still confirming...</h1>
            <p className="text-muted-foreground text-sm mb-4">
              This is taking longer than expected. Your order is saved — check your
              orders page for updates, or contact support if this persists.
            </p>
            <button
              className="text-primary underline text-sm"
              onClick={() => navigate('/orders')}
            >
              Go to my orders
            </button>
          </>
        )}
      </div>
    </div>
  );
}