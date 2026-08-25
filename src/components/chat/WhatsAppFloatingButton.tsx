import { useAuth } from '@/hooks/useAuth';

// Direct Telegram support — replaces the previous WhatsApp button.
const TELEGRAM_URL = 'https://t.me/Extipsguide';

export function WhatsAppFloatingButton() {
  const { user } = useAuth();
  if (!user) return null;

  const href = TELEGRAM_URL;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Chat with us on Telegram"
      data-live-chat-trigger
      className="fixed bottom-24 right-4 lg:bottom-6 lg:right-6 z-50 group"
    >
      {/* Pulse ring */}
      <span
        className="absolute inset-0 rounded-full animate-ping opacity-60"
        style={{ background: '#229ED9' }}
      />
      <span
        className="relative flex items-center justify-center h-14 w-14 rounded-full transition-transform group-hover:scale-110"
        style={{
          background: 'linear-gradient(135deg, #37BBFE, #007DBB)',
          boxShadow: '0 10px 28px rgba(34,158,217,.5), 0 4px 10px rgba(0,0,0,.2)',
          border: '2px solid #fff',
        }}
      >
        {/* Official Telegram glyph */}
        <svg
          viewBox="0 0 24 24"
          width="28"
          height="28"
          fill="#fff"
          aria-hidden="true"
        >
          <path d="M9.78 18.65l.28-4.23 7.68-6.92c.34-.31-.07-.46-.52-.19L7.74 13.3 3.64 12c-.88-.25-.89-.86.2-1.3l15.97-6.16c.73-.33 1.43.18 1.15 1.3l-2.72 12.81c-.19.91-.74 1.13-1.5.71L12.6 16.3l-1.99 1.93c-.23.23-.42.42-.83.42z"/>
        </svg>
      </span>
      {/* Tooltip label */}
      <span
        className="absolute right-16 top-1/2 -translate-y-1/2 whitespace-nowrap px-3 py-1.5 rounded-full text-[12px] font-semibold opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"
        style={{
          background: '#111',
          color: '#fff',
          boxShadow: '0 4px 12px rgba(0,0,0,.25)',
        }}
      >
        Need help? Chat on Telegram
      </span>
    </a>
  );
}