import React from 'react';
import { Link } from "@/lib/router-compat";
import {
  ArrowRight, Sparkles, Shield, Zap, Eye, TrendingUp, Shuffle, Clock,
  Moon, Timer, Brain, Link2, CheckCircle2, FileText, Lock, HelpCircle,
  Mail, Code2,
} from 'lucide-react';
import logo from '@/assets/logo.jpg';
import { PageMeta } from '@/components/seo/PageMeta';

/**
 * FlexiPro — clean sky-blue landing.
 * Palette: soft blue gradient background, deep navy text, vivid blue CTA.
 */

const C = {
  bg1: '#EAF2FF',        // pale sky
  bg2: '#DCE8FF',        // soft blue mid
  bg3: '#C7DAFB',        // deeper blue edge
  ink: '#0F172A',        // near-black navy for headings
  ink2: '#1E293B',
  slate: '#475569',
  slateLight: '#64748B',
  blue: '#2563EB',       // primary CTA blue
  blueDark: '#1D4ED8',
  blueSoft: '#DBEAFE',
  paper: '#FFFFFF',
  line: 'rgba(15,23,42,.08)',
  lineStrong: 'rgba(15,23,42,.14)',
};

const Index = () => {
  return (
    <div
      className="min-h-screen w-full overflow-x-hidden"
      style={{ color: C.ink, fontFamily: "'Inter', system-ui, sans-serif" }}
    >
      <PageMeta
        title="FlexiPro — Best SMM Panel for Organic Social Growth"
        description="AI-powered SMM panel for Instagram, YouTube & TikTok. Real engagement, natural delivery, safe accounts."
        canonicalPath="/"
        breadcrumbs={[{ name: 'Home', path: '/' }]}
      />

      {/* Background gradient wash */}
      <div
        aria-hidden
        className="fixed inset-0 -z-10"
        style={{
          background: `linear-gradient(180deg, ${C.bg1} 0%, ${C.bg2} 55%, ${C.bg3} 100%)`,
        }}
      />
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 opacity-70"
        style={{
          background:
            'radial-gradient(1000px 500px at 50% -10%, rgba(255,255,255,.9), transparent 60%)',
        }}
      />

      {/* ══════ NAV ══════ */}
      <nav className="sticky top-4 z-50 w-full px-3 sm:px-6">
        <div
          className="max-w-6xl mx-auto flex items-center justify-between h-14 pl-3 pr-2 rounded-full"
          style={{
            background: 'rgba(255,255,255,.85)',
            backdropFilter: 'blur(18px) saturate(160%)',
            border: `1px solid ${C.line}`,
            boxShadow: '0 8px 30px rgba(15,23,42,.06)',
          }}
        >
          <Link to="/" className="flex items-center gap-2.5">
            <img
              src={logo}
              alt="FlexiPro"
              className="w-8 h-8 rounded-xl object-cover"
              style={{ border: `1px solid ${C.line}` }}
            />
            <span className="text-[15px] font-bold tracking-tight" style={{ color: C.ink }}>
              FlexiPro
            </span>
            <span
              className="ml-1 text-[10px] font-semibold px-1.5 py-0.5 rounded-md"
              style={{ background: C.blueSoft, color: C.blueDark }}
            >
              v2.0
            </span>
          </Link>
          <div className="hidden md:flex items-center gap-8 text-[13px]" style={{ color: C.slate }}>
            <a href="#features" className="hover:opacity-70 transition-opacity">Features</a>
            <a href="#how-it-works" className="hover:opacity-70 transition-opacity">How it works</a>
            <a href="#how-to-use" className="hover:opacity-70 transition-opacity">How to use</a>
            <a href="#why" className="hover:opacity-70 transition-opacity">Why</a>
          </div>

          <div className="flex items-center gap-2">
            <Link
              to="/auth"
              className="hidden sm:inline-flex h-9 px-3.5 items-center text-[13px] font-medium"
              style={{ color: C.ink }}
            >
              Login
            </Link>
            <Link
              to="/auth"
              className="h-10 px-4 rounded-full text-[13px] font-semibold inline-flex items-center gap-1.5 transition-transform hover:-translate-y-0.5"
              style={{
                background: C.blue,
                color: '#fff',
                boxShadow: `0 8px 20px ${C.blue}55`,
              }}
            >
              Sign Up Free
            </Link>
          </div>
        </div>
      </nav>

      <main>
        {/* ══════ HERO — simple centered ══════ */}
        <section className="relative pt-16 sm:pt-24 pb-10 sm:pb-14 px-4 sm:px-6">
          {/* Sparkle dots */}
          <div aria-hidden className="absolute inset-0 overflow-hidden pointer-events-none">
            {[
              { top: '18%', left: '12%', d: 0 },
              { top: '30%', left: '82%', d: 0.6 },
              { top: '58%', left: '18%', d: 1.2 },
              { top: '68%', left: '78%', d: 0.9 },
              { top: '22%', left: '55%', d: 1.5 },
              { top: '78%', left: '48%', d: 2.0 },
            ].map((s, i) => (
              <span
                key={i}
                className="absolute rounded-full pulse"
                style={{
                  top: s.top,
                  left: s.left,
                  width: 4,
                  height: 4,
                  background: '#fff',
                  boxShadow: '0 0 12px rgba(255,255,255,.9)',
                  animationDelay: `${s.d}s`,
                }}
              />
            ))}
          </div>

          <div className="relative max-w-4xl mx-auto text-center">
            <h1
              className="animate-fade-in text-[2.4rem] sm:text-[3.2rem] lg:text-[4.2rem] font-black leading-[1.05] tracking-[-0.03em]"
              style={{ color: C.ink }}
            >
              FlexiPro — AI-Powered Social Media Growth Panel
            </h1>

            <h2
              className="animate-fade-in mt-4 sm:mt-6 text-[1.75rem] sm:text-[2.5rem] lg:text-[3rem] font-bold leading-[1.15] tracking-[-0.02em]"
              style={{ color: C.ink2, animationDelay: '60ms' }}
            >
              Best SMM Panel for<br />
              Organic Social Growth
            </h2>

            <p
              className="animate-fade-in mt-8 text-[13.5px] sm:text-[15px]"
              style={{ color: C.slate, animationDelay: '120ms' }}
            >
              AI-powered for Instagram, YouTube &amp; TikTok · Real engagement &amp; natural delivery ·
              Safe accounts.
            </p>

            {/* Platform dots */}
            <div
              className="animate-fade-in mt-8 flex items-center justify-center gap-2"
              style={{ animationDelay: '160ms' }}
            >
              {['#E4405F', '#2563EB', '#000000'].map((c, i) => (
                <span
                  key={i}
                  className="rounded-full pulse"
                  style={{ width: 10, height: 10, background: c, opacity: 0.75, animationDelay: `${i * 0.3}s` }}
                />
              ))}
            </div>

            <div className="animate-fade-in mt-10" style={{ animationDelay: '200ms' }}>
              <Link
                to="/auth"
                className="inline-flex h-12 px-8 rounded-full text-[14px] font-bold items-center gap-2 transition-transform hover:-translate-y-0.5"
                style={{
                  background: C.blue,
                  color: '#fff',
                  boxShadow: `0 12px 28px ${C.blue}55`,
                }}
              >
                Sign Up Free <ArrowRight className="w-4 h-4" />
              </Link>
            </div>


            <div className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-[12px]" style={{ color: C.slate }}>
              {['No card needed', 'Every tool unlocked', 'Ready in 60 seconds'].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" style={{ color: C.blue }} /> {t}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* ══════ FEATURES ══════ */}
        <section id="features" className="py-10 sm:py-14 px-4 sm:px-6 lg:px-10">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-12">
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: C.blueDark, background: C.blueSoft, border: `1px solid ${C.line}` }}
              >
                <Zap className="w-3 h-3" /> Built for organic growth
              </span>
              <h2 className="mt-5 text-[2rem] sm:text-[2.75rem] font-black tracking-[-0.02em]" style={{ color: C.ink }}>
                Tuned to move like real people do.
              </h2>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 sm:gap-4">
              {[
                { icon: TrendingUp, title: 'S-Curve Rollout', desc: 'Momentum like a real trend' },
                { icon: Shuffle, title: '±50% Variance', desc: 'Batch sizes shift every drop' },
                { icon: Clock, title: 'Peak-Hour Push', desc: '1.5× lift during 6–10 PM' },
                { icon: Moon, title: 'Overnight Ease-Off', desc: 'Mimics real sleep cycles' },
                { icon: Timer, title: '±5min Jitter', desc: 'Timing no bot can fake' },
                { icon: Eye, title: 'Live Preview', desc: 'See the plan before you pay' },
              ].map((f, i) => (
                <div
                  key={f.title}
                  className="group rounded-2xl p-4 sm:p-5 reveal-up hover-lift"
                  style={{
                    animationDelay: `${i * 60}ms`,
                    background: C.paper,
                    border: `1px solid ${C.line}`,
                    boxShadow: '0 4px 20px rgba(15,23,42,.04)',
                  }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
                    style={{ background: C.blueSoft }}
                  >
                    <f.icon className="w-4 h-4" style={{ color: C.blue }} />
                  </div>
                  <h3 className="text-[13px] font-bold mb-1" style={{ color: C.ink }}>{f.title}</h3>
                  <p className="text-[11px] leading-relaxed" style={{ color: C.slate }}>{f.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>


        {/* ══════ WHY US ══════ */}
        <section id="why" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-10">
          <div
            className="max-w-5xl mx-auto rounded-[28px] overflow-hidden"
            style={{
              background: C.paper,
              border: `1px solid ${C.line}`,
              boxShadow: '0 20px 60px rgba(15,23,42,.08)',
            }}
          >
            <div className="grid md:grid-cols-2">
              <div className="p-7 sm:p-10" style={{ borderRight: `1px solid ${C.line}` }}>
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center text-[15px]"
                       style={{ background: '#F1F5F9', color: C.slate }}>×</div>
                  <span className="text-[14px] font-semibold" style={{ color: C.slate }}>Typical SMM panels</span>
                </div>
                {[
                  'Identical batches every run — instant giveaway',
                  'Clockwork intervals — bots leave a fingerprint',
                  'Non-stop dumping — nothing looks human',
                  'Handles get shadow-flagged or wiped',
                ].map(t => (
                  <div key={t} className="flex items-start gap-2.5 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: '#EF4444' }} />
                    <span className="text-[13px] leading-relaxed" style={{ color: C.slate }}>{t}</span>
                  </div>
                ))}
              </div>
              <div className="p-7 sm:p-10 relative"
                   style={{ background: `linear-gradient(135deg, ${C.blueSoft} 0%, ${C.paper} 100%)` }}>
                <span className="absolute top-5 right-5 text-[10px] font-bold uppercase tracking-widest px-2.5 py-1 rounded-full"
                      style={{ background: C.blue, color: '#fff' }}>Our approach</span>
                <div className="flex items-center gap-2.5 mb-6">
                  <div className="w-9 h-9 rounded-full flex items-center justify-center"
                       style={{ background: '#fff', border: `1px solid ${C.line}` }}>
                    <CheckCircle2 className="w-4 h-4" style={{ color: C.blue }} />
                  </div>
                  <span className="text-[14px] font-semibold" style={{ color: C.ink }}>FlexiPro</span>
                </div>
                {[
                  'Every drop is a fresh shape — reads like real fans',
                  'Micro-jittered timing — no repeating cadence',
                  'Prime-time lift, quiet nights — matches user habits',
                  'Zero bans logged across 50k+ deliveries',
                ].map(t => (
                  <div key={t} className="flex items-start gap-2.5 mb-3">
                    <span className="w-1.5 h-1.5 rounded-full mt-2 shrink-0" style={{ background: C.blue }} />
                    <span className="text-[13px] leading-relaxed" style={{ color: C.ink }}>{t}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="flex flex-wrap justify-center gap-6 sm:gap-10 py-5 px-6 text-[12.5px]"
                 style={{ borderTop: `1px solid ${C.line}`, background: '#F8FAFC', color: C.slate }}>
              <span className="flex items-center gap-2"><TrendingUp className="w-3.5 h-3.5" style={{ color: C.blue }} /> 50,000+ campaigns</span>
              <span className="flex items-center gap-2"><Shield className="w-3.5 h-3.5" style={{ color: C.blue }} /> Zero handles banned</span>
              <span className="flex items-center gap-2"><Zap className="w-3.5 h-3.5" style={{ color: C.blue }} /> 99.9% uptime</span>
            </div>
          </div>
        </section>

        {/* ══════ HOW IT WORKS ══════ */}
        <section id="how-it-works" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-10">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: C.blueDark, background: C.blueSoft, border: `1px solid ${C.line}` }}
              >
                <Sparkles className="w-3 h-3" /> How it works
              </span>
              <h2 className="mt-5 text-[2rem] sm:text-[2.75rem] font-black tracking-[-0.02em]" style={{ color: C.ink }}>
                Drop one link. Everything else runs on its own.
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {[
                { step: '01', icon: Link2, title: 'Drop the URL', desc: 'Paste any Instagram, YouTube or TikTok link.' },
                { step: '02', icon: Sparkles, title: 'Choose the mix', desc: 'Flip on views, likes, comments, saves or shares.' },
                { step: '03', icon: Brain, title: 'Engine plans it', desc: 'S-curve pacing, ±50% variance, peak-hour lifts.' },
                { step: '04', icon: TrendingUp, title: 'Watch it unfold', desc: 'Rolls in gradually, tracked live, safe.' },
              ].map((s, i) => (
                <div
                  key={s.step}
                  className="relative rounded-2xl p-5 reveal-up"
                  style={{
                    animationDelay: `${i * 80}ms`,
                    background: C.paper,
                    border: `1px solid ${C.line}`,
                    boxShadow: '0 8px 24px rgba(15,23,42,.05)',
                  }}
                >
                  <span className="absolute -top-3 -right-3 text-[10px] font-mono font-bold tracking-widest px-2.5 py-1 rounded-full"
                        style={{ background: C.ink, color: '#fff' }}>{s.step}</span>
                  <div className="w-11 h-11 rounded-xl flex items-center justify-center mb-4"
                       style={{ background: C.blueSoft }}>
                    <s.icon className="w-5 h-5" style={{ color: C.blue }} />
                  </div>
                  <h3 className="text-[14.5px] font-bold mb-1.5" style={{ color: C.ink }}>{s.title}</h3>
                  <p className="text-[12.5px] leading-relaxed" style={{ color: C.slate }}>{s.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* ══════ HOW TO USE ══════ */}
        <section id="how-to-use" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-10">
          <div className="max-w-5xl mx-auto">
            <div className="text-center mb-12">
              <span
                className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px] font-semibold uppercase tracking-[0.14em]"
                style={{ color: C.blueDark, background: C.blueSoft, border: `1px solid ${C.line}` }}
              >
                <FileText className="w-3 h-3" /> How to use
              </span>
              <h2 className="mt-5 text-[2rem] sm:text-[2.75rem] font-black tracking-[-0.02em]" style={{ color: C.ink }}>
                A simple guide to your first campaign.
              </h2>
              <p className="mt-4 text-[14px] max-w-xl mx-auto" style={{ color: C.slate }}>
                Follow these five steps — from sign up to live delivery. Takes about 60 seconds.
              </p>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {[
                {
                  n: '1',
                  title: 'Create your free account',
                  desc: 'Sign up with email — no card needed. You land straight on the dashboard.',
                },
                {
                  n: '2',
                  title: 'Add funds to your wallet',
                  desc: 'Open Wallet, pick UPI or crypto, top up any amount. Balance is instant.',
                },
                {
                  n: '3',
                  title: 'Paste your post link',
                  desc: 'Go to Engagement Order, drop any Instagram, YouTube or TikTok URL.',
                },
                {
                  n: '4',
                  title: 'Pick views, likes, comments & more',
                  desc: 'Toggle each engagement type on and set the quantity. Preview shows exact rollout.',
                },
                {
                  n: '5',
                  title: 'Place order & track live',
                  desc: 'Hit Place Order — the engine drips it out on a human pattern. Watch it grow in real-time.',
                },
              ].map((s) => (
                <div
                  key={s.n}
                  className="flex items-start gap-4 sm:gap-5 rounded-2xl p-5 sm:p-6"
                  style={{
                    background: C.paper,
                    border: `1px solid ${C.line}`,
                    boxShadow: '0 4px 20px rgba(15,23,42,.04)',
                  }}
                >
                  <div
                    className="shrink-0 w-11 h-11 rounded-full flex items-center justify-center text-[15px] font-black"
                    style={{ background: C.blue, color: '#fff', boxShadow: `0 6px 16px ${C.blue}44` }}
                  >
                    {s.n}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="text-[15px] sm:text-[16px] font-bold mb-1" style={{ color: C.ink }}>
                      {s.title}
                    </h3>
                    <p className="text-[13px] leading-relaxed" style={{ color: C.slate }}>
                      {s.desc}
                    </p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-10 text-center">
              <Link
                to="/auth"
                className="inline-flex h-12 px-8 rounded-full text-[14px] font-bold items-center gap-2 transition-transform hover:-translate-y-0.5"
                style={{ background: C.blue, color: '#fff', boxShadow: `0 12px 28px ${C.blue}55` }}
              >
                Start your first campaign <ArrowRight className="w-4 h-4" />
              </Link>
              <p className="mt-3 text-[12px]" style={{ color: C.slateLight }}>
                Free to start · Ready in 60 seconds
              </p>
            </div>
          </div>
        </section>

      </main>

      {/* ══════ FOOTER ══════ */}
      <footer className="pt-14 pb-10 px-4 sm:px-6 lg:px-10" style={{ borderTop: `1px solid ${C.line}` }}>
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
            <div className="col-span-2 sm:col-span-1">
              <div className="flex items-center gap-2.5 mb-4">
                <img src={logo} alt="FlexiPro" className="w-9 h-9 rounded-xl object-cover" style={{ border: `1px solid ${C.line}` }} />
                <span className="text-[15px] font-bold" style={{ color: C.ink }}>FlexiPro</span>
              </div>
              <p className="text-[13px] leading-relaxed" style={{ color: C.slate }}>
                Organic social growth for creators. Human-pattern delivery, calibrated for every platform.
              </p>
            </div>
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: C.ink }}>Product</h3>
              <div className="space-y-2.5">
                <Link to="/auth" className="block text-[13px]" style={{ color: C.slate }}>Get started</Link>
              </div>
            </div>
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: C.ink }}>Legal</h3>
              <div className="space-y-2.5">
                {[
                  { to: '/terms', icon: FileText, label: 'Terms' },
                  { to: '/privacy', icon: Lock, label: 'Privacy' },
                  { to: '/refund', icon: FileText, label: 'Refund' },
                  { to: '/shipping', icon: FileText, label: 'Shipping' },
                  { to: '/cookies', icon: FileText, label: 'Cookies' },
                ].map(l => (
                  <Link key={l.to} to={l.to} className="flex items-center gap-1.5 text-[13px]" style={{ color: C.slate }}>
                    <l.icon className="w-3 h-3" /> {l.label}
                  </Link>
                ))}
              </div>
            </div>
            <div>
              <h3 className="text-[11px] font-bold uppercase tracking-widest mb-4" style={{ color: C.ink }}>Support</h3>
              <div className="space-y-2.5">
                {[
                  { to: '/about', icon: HelpCircle, label: 'About us' },
                  { to: '/contact', icon: Mail, label: 'Contact' },
                  { to: '/support', icon: HelpCircle, label: 'Help center' },
                  { to: '/api-access', icon: Code2, label: 'API docs' },
                ].map(l => (
                  <Link key={l.label} to={l.to} className="flex items-center gap-1.5 text-[13px]" style={{ color: C.slate }}>
                    <l.icon className="w-3 h-3" /> {l.label}
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-[12px]"
               style={{ borderTop: `1px solid ${C.line}`, color: C.slateLight }}>
            <span>© {new Date().getFullYear()} FlexiPro. All rights reserved.</span>
            <span>Made for creators who care about their reach.</span>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Index;
