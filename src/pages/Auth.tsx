import { useState, useEffect } from 'react';
import { useNavigate, Link } from "@/lib/router-compat";

import { useAuth } from '@/hooks/useAuth';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Mail, Loader2, ArrowLeft, Eye, EyeOff, ArrowRight, Sparkles, Shield,
  CheckCircle2, Heart, Star,
} from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { z } from 'zod';
import logo from '@/assets/logo.jpg';
import { PageMeta } from '@/components/seo/PageMeta';

const loginSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters'),
});

const C = {
  cream: '#EAF2FF',
  cream2: '#DCE8FF',
  navy: '#0F172A',
  magenta: '#2563EB',
  magentaSoft: '#DBEAFE',
  gold: '#F5B700',
  slate: '#475569',
  line: 'rgba(15,23,42,.08)',
  lineStrong: 'rgba(15,23,42,.14)',
  paper: '#FFFFFF',
};


const displayFont = "'Manrope', system-ui, sans-serif";

/* Tiny animated scene for the brand panel */
const BrandScene = () => (
  <div className="relative w-full max-w-[380px] aspect-square mx-auto">
    <svg viewBox="0 0 400 400" className="w-full h-full">
      <defs>
        <linearGradient id="a-shop" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="100%" stopColor="#F1EBDE" />
        </linearGradient>
        <linearGradient id="a-shopSide" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#EDE6D6" />
          <stop offset="100%" stopColor="#D9D0BC" />
        </linearGradient>
        <linearGradient id="a-magenta" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="#3B82F6" />
          <stop offset="100%" stopColor={C.magenta} />
        </linearGradient>
      </defs>

      {/* Floor tiles */}
      {[0, 1, 2, 3].map(i => (
        <path
          key={i}
          d={`M ${40 + i * 70} 300 l 55 28 l 55 -28 l -55 -28 z`}
          fill="#FFFFFF" opacity="0.85"
          stroke="rgba(11,31,75,.06)"
        />
      ))}

      {/* Shop building */}
      <path d="M 180 170 L 320 240 L 380 210 L 240 140 Z" fill="url(#a-shop)" stroke="rgba(11,31,75,.08)" />
      <path d="M 180 170 L 180 340 L 320 410 L 320 240 Z" fill="url(#a-shop)" stroke="rgba(11,31,75,.06)" />
      <path d="M 320 240 L 320 410 L 380 380 L 380 210 Z" fill="url(#a-shopSide)" stroke="rgba(11,31,75,.06)" />

      <path d="M 215 255 Q 215 226 240 238 L 240 348 L 215 336 Z" fill="url(#a-magenta)" />
      <path d="M 240 238 Q 240 208 265 220 L 265 358 L 240 348 Z" fill="#1D4ED8" opacity="0.85" />

      {/* awning */}
      <path d="M 320 240 L 380 210 L 380 232 L 320 262 Z" fill="#FFFFFF" />
      {[0, 1, 2, 3].map(i => (
        <path
          key={i}
          d={`M ${330 + i * 12} ${254 - i * 6} l 12 -6 l 0 11 l -12 6 z`}
          fill={C.magenta} opacity="0.9"
        />
      ))}
      <path d="M 320 262 L 380 232 L 372 250 L 325 274 Z" fill={C.magenta} opacity="0.7" />
    </svg>

    {/* Floating chips (static) */}
    <div
      className="absolute flex items-center gap-2 px-3 py-2 rounded-full"
      style={{ top: '10%', left: '2%', background: C.paper, border: `1px solid ${C.line}`, boxShadow: '0 12px 30px rgba(11,31,75,.08)' }}
    >
      <Heart className="w-3.5 h-3.5" style={{ color: C.magenta }} />
      <span className="text-[11px] font-semibold" style={{ color: C.navy }}>+318 likes</span>
    </div>
    <div
      className="absolute flex items-center gap-2 px-3 py-2 rounded-full"
      style={{ bottom: '18%', right: '2%', background: C.paper, border: `1px solid ${C.line}`, boxShadow: '0 12px 30px rgba(11,31,75,.08)' }}
    >
      <Sparkles className="w-3.5 h-3.5" style={{ color: C.gold }} />
      <span className="text-[11px] font-semibold" style={{ color: C.navy }}>Human-pattern</span>
    </div>

  </div>
);

export default function Auth() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [showVerifyEmail, setShowVerifyEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { signIn, signUp, user, isLoading } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    if (!isLoading && user) navigate('/engagement-order');
  }, [user, isLoading, navigate]);

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccessMessage(''); setIsSubmitting(true);
    try {
      const trimmedEmail = email.trim().toLowerCase();
      if (!trimmedEmail || !z.string().email().safeParse(trimmedEmail).success) {
        setError('Please enter a valid email address'); setIsSubmitting(false); return;
      }
      const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, { redirectTo: `${window.location.origin}/auth` });
      if (error) setError(error.message); else setSuccessMessage('Password reset email sent! Check your inbox.');
    } catch { setError('Something went wrong.'); }
    finally { setIsSubmitting(false); }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(''); setSuccessMessage(''); setIsSubmitting(true);
    try {
      if (isLogin) {
        const v = loginSchema.safeParse({ email, password });
        if (!v.success) { setError(v.error.errors[0].message); setIsSubmitting(false); return; }
        const { error } = await signIn(email, password);
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('invalid login credentials')) setError('Incorrect email or password.');
          else if (msg.includes('email not confirmed')) setError('Please verify your email first.');
          else if (msg.includes('rate limit')) setError('Too many attempts. Try again in 5 mins.');
          else setError('Login failed.');
          setIsSubmitting(false); return;
        }
        navigate('/engagement-order', { replace: true });
      } else {
        const v = signupSchema.safeParse({ email, password, fullName });
        if (!v.success) { setError(v.error.errors[0].message); setIsSubmitting(false); return; }
        const { error } = await signUp(email, password, fullName);
        if (error) {
          const msg = error.message.toLowerCase();
          if (msg.includes('already registered')) setError('This email is already registered.');
          else if (msg.includes('rate limit')) setError('Too many attempts. Wait 5 minutes.');
          else setError(error.message || 'Signup failed.');
          setIsSubmitting(false); return;
        }
        setSuccessMessage('Account created successfully!');
        setTimeout(() => setIsLogin(true), 2000);
      }
    } catch (err: any) {
      if (!err?.message?.includes('abort')) setError('Something went wrong. Please try again.');
    } finally { setIsSubmitting(false); }
  };

  const inputStyle: React.CSSProperties = {
    height: 48,
    borderRadius: 14,
    background: C.paper,
    border: `1px solid ${C.lineStrong}`,
    color: C.navy,
    padding: '0 16px',
    fontWeight: 500,
  };

  return (
    <div
      className="min-h-screen w-full grid lg:grid-cols-2 relative overflow-hidden"
      style={{ background: `linear-gradient(180deg, #EAF2FF 0%, #DCE8FF 55%, #C7DAFB 100%)`, color: C.navy, fontFamily: "'Inter', system-ui, sans-serif" }}
    >

      <PageMeta
        title={isLogin ? 'Sign in — FlexiPro' : 'Create your account — FlexiPro'}
        description="Sign in or create your free FlexiPro account to launch organic Instagram, YouTube and TikTok growth campaigns."
        canonicalPath="/auth"
      />


      {/* Ambient wash */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 w-[600px] h-[600px] rounded-full"
             style={{ background: `radial-gradient(closest-side, ${C.magentaSoft}, transparent 70%)`, filter: 'blur(40px)' }} />
        <div className="absolute bottom-[-20%] right-[-10%] w-[600px] h-[600px] rounded-full"
             style={{ background: `radial-gradient(closest-side, rgba(245,183,0,.14), transparent 70%)`, filter: 'blur(40px)' }} />
      </div>

      {/* LEFT — brand panel */}
      <div className="hidden lg:flex relative flex-col justify-between p-12"
           style={{ borderRight: `1px solid ${C.line}` }}>
        <Link to="/" className="flex items-center gap-2.5 relative z-10">
          <img src={logo} alt="FlexiPro" className="w-9 h-9 rounded-xl object-cover"
               style={{ border: `1px solid ${C.line}` }} />
          <span className="text-[16px] font-bold tracking-tight" style={{ color: C.navy }}>
            FlexiPro.in
          </span>
        </Link>

        <div className="relative z-10">
          <span className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: C.magenta, background: C.magentaSoft, border: '1px solid rgba(230,57,138,.20)' }}>
            <Sparkles className="w-3 h-3" /> v2.0 · Human-pattern engine
          </span>
          <h2 className="mt-6 text-[3rem] leading-[0.98] font-black tracking-[-0.03em]"
              style={{ fontFamily: displayFont, color: C.navy }}>
            Grow the<br />
            <em style={{ fontStyle: 'italic', fontWeight: 500, color: C.magenta }}>human way.</em>
          </h2>
          <p className="mt-5 max-w-md text-[15px] leading-[1.65]" style={{ color: C.slate }}>
            Sign in to choreograph views, likes and comments on a rhythm no platform can flag.
          </p>

          <div className="mt-8">
            <BrandScene />
          </div>
        </div>

        <div className="relative z-10 flex items-center gap-4 text-[12px]" style={{ color: C.slate }}>
          <span className="flex items-center gap-1.5">
            <Shield className="w-3.5 h-3.5" style={{ color: C.magenta }} /> SSL · encrypted
          </span>
          <span className="flex items-center gap-1.5">
            {[1, 2, 3, 4, 5].map(i => <Star key={i} className="w-3 h-3 fill-current" style={{ color: C.gold }} />)}
            <strong style={{ color: C.navy }}>4.9/5</strong>
          </span>
        </div>
      </div>

      {/* RIGHT — auth form */}
      <div className="flex items-center justify-center px-5 sm:px-8 py-12 relative">
        <div
          className="w-full max-w-[420px]"
        >

          {/* Mobile logo */}
          <div className="lg:hidden flex items-center justify-center gap-2.5 mb-10">
            <img src={logo} alt="FlexiPro" className="w-10 h-10 rounded-xl object-cover"
                 style={{ border: `1px solid ${C.line}` }} />
            <span className="text-[16px] font-bold tracking-tight" style={{ color: C.navy }}>
              FlexiPro.in
            </span>
          </div>

          <Link to="/" className="inline-flex items-center gap-1.5 text-[12px] mb-8" style={{ color: C.slate }}>
            <ArrowLeft className="w-3.5 h-3.5" /> Back to home
          </Link>

          <h1 className="text-[2.2rem] leading-[1.05] font-black tracking-[-0.02em] mb-2"
              style={{ fontFamily: displayFont, color: C.navy }}>
            {isForgotPassword ? 'Reset ' : isLogin ? 'Welcome ' : 'Create '}
            <em style={{ fontStyle: 'italic', fontWeight: 500, color: C.magenta }}>
              {isForgotPassword ? 'password' : isLogin ? 'back' : 'account'}
            </em>
          </h1>
          <p className="text-[14px] mb-8" style={{ color: C.slate }}>
            {isForgotPassword ? 'Enter your email — we\'ll send a reset link.' : isLogin ? 'Sign in to your FlexiPro account.' : 'Free to start. Every tool unlocked.'}
          </p>

          {showVerifyEmail ? (
            <div className="text-center py-8">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center mx-auto mb-6"
                   style={{ background: C.magentaSoft, border: `1px solid rgba(230,57,138,.24)` }}>
                <Mail className="w-7 h-7" style={{ color: C.magenta }} />
              </div>
              <h3 className="text-xl font-bold mb-2" style={{ color: C.navy }}>Check your inbox</h3>
              <p className="text-[13px] mb-1" style={{ color: C.slate }}>Verification link sent to:</p>
              <p className="text-[13px] font-semibold mb-6" style={{ color: C.navy }}>{email}</p>
              <button onClick={() => { setShowVerifyEmail(false); setIsLogin(true); }}
                      className="text-[13px] font-semibold" style={{ color: C.magenta }}>
                ← Back to login
              </button>
            </div>
          ) : (
            <form onSubmit={isForgotPassword ? handleForgotPassword : handleSubmit} className="space-y-4">
              {isForgotPassword ? (
                <>
                  <div>
                    <Label className="text-[12px] font-semibold mb-1.5 block" style={{ color: C.slate, textTransform: 'none', letterSpacing: 'normal' }}>Email</Label>
                    <Input type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
                  </div>
                  {error && <p className="text-[13px] font-medium" style={{ color: '#EF4444' }}>{error}</p>}
                  {successMessage && <p className="text-[13px] font-medium" style={{ color: C.magenta }}>{successMessage}</p>}
                  <button type="submit" disabled={isSubmitting}
                          className="w-full h-12 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5 disabled:opacity-70"
                          style={{ background: C.magenta, color: '#fff', boxShadow: `0 14px 30px ${C.magenta}55` }}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>Send reset link <ArrowRight className="w-3.5 h-3.5" /></>}
                  </button>
                  <button type="button" onClick={() => setIsForgotPassword(false)} className="w-full text-center text-[13px]" style={{ color: C.slate }}>
                    Back to login
                  </button>
                </>
              ) : (
                <>
                  {!isLogin && (
                    <div>
                      <Label className="text-[12px] font-semibold mb-1.5 block" style={{ color: C.slate, textTransform: 'none', letterSpacing: 'normal' }}>Full name</Label>
                      <Input placeholder="John Doe" value={fullName} onChange={e => setFullName(e.target.value)} style={inputStyle} />
                    </div>
                  )}
                  <div>
                    <Label className="text-[12px] font-semibold mb-1.5 block" style={{ color: C.slate, textTransform: 'none', letterSpacing: 'normal' }}>Email</Label>
                    <Input type="email" placeholder="name@example.com" value={email} onChange={e => setEmail(e.target.value)} style={inputStyle} />
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <Label className="text-[12px] font-semibold" style={{ color: C.slate, textTransform: 'none', letterSpacing: 'normal' }}>Password</Label>
                      {isLogin && (
                        <button type="button" onClick={() => setIsForgotPassword(true)} className="text-[11px] font-medium" style={{ color: C.magenta }}>
                          Forgot password?
                        </button>
                      )}
                    </div>
                    <div className="relative">
                      <Input type={showPassword ? 'text' : 'password'} placeholder="••••••••" value={password} onChange={e => setPassword(e.target.value)}
                             style={{ ...inputStyle, paddingRight: 44 }} />
                      <button type="button" aria-label="Toggle password visibility" onClick={() => setShowPassword(!showPassword)}
                              className="absolute right-3.5 top-1/2 -translate-y-1/2" style={{ color: C.slate }}>
                        {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {error && <p className="text-[13px] font-medium" style={{ color: '#EF4444' }}>{error}</p>}
                  {successMessage && <p className="text-[13px] font-medium" style={{ color: C.magenta }}>{successMessage}</p>}

                  <button type="submit" disabled={isSubmitting}
                          className="w-full h-12 rounded-2xl text-[14px] font-bold flex items-center justify-center gap-2 transition-transform hover:-translate-y-0.5 disabled:opacity-70"
                          style={{ background: C.magenta, color: '#fff', boxShadow: `0 14px 30px ${C.magenta}55` }}>
                    {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <>{isLogin ? 'Sign in' : 'Create account'} <ArrowRight className="w-3.5 h-3.5" /></>}
                  </button>

                  <p className="text-center text-[13px]" style={{ color: C.slate }}>
                    {isLogin ? "Don't have an account? " : 'Already have an account? '}
                    <button type="button" onClick={() => { setIsLogin(!isLogin); setError(''); setSuccessMessage(''); }}
                            className="font-semibold" style={{ color: C.magenta }}>
                      {isLogin ? 'Sign up' : 'Sign in'}
                    </button>
                  </p>
                </>
              )}
            </form>
          )}

          {/* Telegram */}
          <a href="https://t.me/BMG009" target="_blank" rel="noopener noreferrer"
             className="mt-8 flex items-center gap-3 p-3.5 rounded-2xl transition-colors"
             style={{ border: `1px solid ${C.line}`, background: C.paper }}>
            <div className="w-9 h-9 rounded-lg flex items-center justify-center"
                 style={{ background: 'rgba(0,136,204,.10)' }}>
              <svg className="w-4 h-4 fill-[#0088cc]" viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69.01-.03.01-.14-.07-.2-.08-.06-.19-.04-.27-.02-.11.02-1.93 1.23-5.46 3.62-.51.35-.98.53-1.39.52-.46-.01-1.33-.26-1.98-.48-.8-.27-1.43-.42-1.37-.89.03-.25.38-.51 1.03-.78 4.04-1.76 6.74-2.92 8.09-3.48 3.85-1.61.8-1.88 1.77-1.88.21 0 .69.05.99.23.32.19.43.46.46.72.02.16.01.32-.01.48z" /></svg>
            </div>
            <div>
              <p className="text-[13px] font-semibold" style={{ color: C.navy }}>Join our Telegram</p>
              <p className="text-[11.5px]" style={{ color: C.slate }}>Updates & support</p>
            </div>
          </a>
        </div>
      </div>
    </div>
  );
}
