// src/components/ShoppingAssistant.tsx
import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Sparkles, X, Send, Star } from 'lucide-react';
import api from '@/services/api';

interface AssistantProduct {
  _id: string;
  name: string;
  price: number;
  imageUrl: string;
  averageRating?: number;
  vendor?: { fullName: string };
}

interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  products?: AssistantProduct[];
}

const WELCOME_MESSAGE: ChatMessage = {
  role: 'assistant',
  content:
    "Hi! I'm Sphere, your shopping assistant. Tell me what you're looking for — a product, a budget, or a category — and I'll help you find it.",
};

function TypingIndicator() {
  return (
    <div className="flex items-center gap-1 px-3 py-2" aria-label="Assistant is typing">
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 motion-safe:animate-bounce [animation-delay:-0.3s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 motion-safe:animate-bounce [animation-delay:-0.15s]" />
      <span className="w-1.5 h-1.5 rounded-full bg-muted-foreground/50 motion-safe:animate-bounce" />
    </div>
  );
}

function AssistantProductCard({ product }: { product: AssistantProduct }) {
  return (
    <Link
      to={`/product/${product._id}`}
      className="flex items-center gap-3 rounded-lg border bg-card p-2 hover:shadow-card transition-shadow"
    >
      <div className="w-12 h-12 rounded-md overflow-hidden bg-muted shrink-0">
        <img
          src={product.imageUrl || '/placeholder.svg'}
          alt={product.name}
          loading="lazy"
          decoding="async"
          className="w-full h-full object-cover"
        />
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium truncate">{product.name}</p>
        <div className="flex items-center gap-2">
          <span className="font-mono-price text-sm font-semibold text-primary">
            ₦{product.price.toLocaleString()}
          </span>
          {!!product.averageRating && (
            <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
              <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
              {product.averageRating}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}

export function ShoppingAssistant() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isSending, open]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = input.trim();
    if (!trimmed || isSending) return;

    const userMessage: ChatMessage = { role: 'user', content: trimmed };
    const nextMessages = [...messages, userMessage];

    setMessages(nextMessages);
    setInput('');
    setIsSending(true);
    setError(null);

    try {
      // Only role/content are sent to the backend — product data attached
      // to past assistant messages is for display only.
      const payload = nextMessages.map(({ role, content }) => ({ role, content }));
      const res = await api.chatWithAssistant(payload);

      if (res.success) {
        setMessages((prev) => [
          ...prev,
          { role: 'assistant', content: res.message, products: res.products },
        ]);
      } else {
        throw new Error('Assistant request failed');
      }
    } catch (err) {
      console.error('Assistant error:', err);
      setError("Sphere is having trouble responding right now. Please try again in a moment.");
    } finally {
      setIsSending(false);
    }
  };

  return (
    <>
      {/* Floating panel */}
      {open && (
        <div className="fixed bottom-24 right-4 sm:right-6 z-50 w-[calc(100vw-2rem)] max-w-sm h-[70vh] max-h-[560px] flex flex-col rounded-2xl border bg-card shadow-elegant motion-safe:animate-scale-in overflow-hidden">
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b bg-gradient-primary text-white shrink-0">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4" />
              <span className="font-semibold text-sm">Sphere · Shopping Assistant</span>
            </div>
            <button
              onClick={() => setOpen(false)}
              aria-label="Close assistant"
              className="rounded-full p-1 hover:bg-white/10 transition-colors"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {/* Messages */}
          <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={msg.role === 'user' ? 'flex justify-end' : 'flex justify-start'}>
                <div
                  className={`max-w-[85%] rounded-2xl px-4 py-2 text-sm ${
                    msg.role === 'user'
                      ? 'bg-primary text-primary-foreground rounded-br-sm'
                      : 'bg-muted text-foreground rounded-bl-sm'
                  }`}
                >
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                  {!!msg.products?.length && (
                    <div className="mt-3 space-y-2">
                      {msg.products.slice(0, 4).map((p) => (
                        <AssistantProductCard key={p._id} product={p} />
                      ))}
                    </div>
                  )}
                </div>
              </div>
            ))}

            {isSending && (
              <div className="flex justify-start">
                <div className="bg-muted rounded-2xl rounded-bl-sm">
                  <TypingIndicator />
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-destructive text-center">{error}</p>
            )}
          </div>

          {/* Input */}
          <form onSubmit={handleSend} className="flex items-center gap-2 p-3 border-t shrink-0">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about a product or budget..."
              disabled={isSending}
              className="flex-1"
            />
            <Button type="submit" size="icon" disabled={isSending || !input.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </div>
      )}

      {/* Floating toggle button */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? 'Close shopping assistant' : 'Open shopping assistant'}
        className="fixed bottom-4 right-4 sm:right-6 z-50 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-elegant flex items-center justify-center hover:scale-105 transition-transform motion-safe:animate-float"
      >
        {open ? <X className="h-6 w-6" /> : <Sparkles className="h-6 w-6" />}
      </button>
    </>
  );
}

export default ShoppingAssistant;