import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { X, Play, Sparkles } from "lucide-react";

type PopupAd = {
  id: string;
  youtube_video_id: string;
  title: string;
  description: string;
  enabled: boolean;
  skip_after_seconds: number;
  last_force_trigger: string | null;
  version: number;
  starts_at: string | null;
  ends_at: string | null;
  video_layout?: "auto" | "landscape" | "portrait" | null;
};

// Per-browser keys
const DAILY_KEY    = "popup_ad_daily_v2"; // { date, count, triggers: string[] }
const SESSION_KEY  = "popup_ad_session_trigger_v2"; // last force trigger shown in this tab session
const SEEN_FORCE_KEY = "popup_ad_seen_force_v1"; // last force trigger consumed in this browser (persists across sessions)
const DAILY_LIMIT  = 2; // max popups per browser per day (admin-force only)
const SCHEDULE_KEY = "popup_ad_schedule_v1"; // { triggerId, slots: number[] } — randomized 24h slot plan
const SHOWS_PER_TRIGGER = 2; // total shows per trigger per 24h (1 immediate + 1 random)
const WINDOW_MS = 24 * 60 * 60 * 1000;
const FIRST_SLOT_MIN_MS = 2 * 60 * 1000;  // earliest first slot: ~2 min from now

type SchedulePlan = { triggerId: string; slots: number[] };
function getSchedule(): SchedulePlan | null {
  try {
    const raw = localStorage.getItem(SCHEDULE_KEY);
    if (!raw) return null;
    const obj = JSON.parse(raw) as SchedulePlan;
    if (!obj || !Array.isArray(obj.slots)) return null;
    return obj;
  } catch { return null; }
}
function setSchedule(plan: SchedulePlan | null) {
  if (!plan || plan.slots.length === 0) {
    localStorage.removeItem(SCHEDULE_KEY);
  } else {
    localStorage.setItem(SCHEDULE_KEY, JSON.stringify(plan));
  }
}
/** Pick N random unix-ms timestamps in [fromMs, toMs], sorted ascending. */
function pickRandomSlots(n: number, fromMs: number, toMs: number): number[] {
  if (toMs <= fromMs || n <= 0) return [];
  const span = toMs - fromMs;
  const out: number[] = [];
  for (let i = 0; i < n; i++) {
    out.push(Math.floor(fromMs + Math.random() * span));
  }
  return out.sort((a, b) => a - b);
}

function todayStr() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}
type DailyState = { date: string; count: number; triggers: string[] };
function getDaily(): DailyState {
  try {
    const raw = localStorage.getItem(DAILY_KEY);
    if (raw) {
      const obj = JSON.parse(raw) as DailyState;
      if (obj.date === todayStr()) {
        return { date: obj.date, count: obj.count || 0, triggers: obj.triggers || [] };
      }
    }
  } catch { /* ignore */ }
  return { date: todayStr(), count: 0, triggers: [] };
}
function bumpDaily(triggerId: string) {
  const cur = getDaily();
  if (cur.triggers.includes(triggerId)) return; // never double-count same trigger
  const next: DailyState = {
    date: cur.date,
    count: cur.count + 1,
    triggers: [...cur.triggers, triggerId].slice(-20),
  };
  localStorage.setItem(DAILY_KEY, JSON.stringify(next));
}

/** Accepts either a raw YouTube ID or a full URL (watch?v=, youtu.be/, shorts/, embed/). */
function parseYouTubeId(input: string): string {
  const s = (input || "").trim();
  if (!s) return "";
  if (/^[a-zA-Z0-9_-]{6,20}$/.test(s)) return s;
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    const v = url.searchParams.get("v");
    if (v) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    const last = parts[parts.length - 1] || "";
    if (last) return last;
  } catch {
    /* ignore */
  }
  return s;
}

/** Detect a YouTube Short from the raw input (URL contains /shorts/). */
function isYouTubeShort(input: string): boolean {
  const s = (input || "").trim().toLowerCase();
  if (!s) return false;
  return s.includes("/shorts/") || s.startsWith("shorts/");
}

/** Resolve final portrait/landscape based on admin override + URL detection. */
function resolveIsPortrait(layout: string | null | undefined, rawInput: string): boolean {
  if (layout === "landscape") return false;
  if (layout === "portrait") return true;
  return isYouTubeShort(rawInput);
}

export function PopupAdDialog() {
  const [ad, setAd] = useState<PopupAd | null>(null);
  const [open, setOpen] = useState(false);
  const [canSkip, setCanSkip] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(0);
  const lastSeenForceRef = useRef<string | null>(null);
  const pendingTimerRef = useRef<number | null>(null);
  const scheduledTriggerRef = useRef<string | null>(null);

  // ---- Mobile draggable state ----
  const [drag, setDrag] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStateRef = useRef<{
    active: boolean;
    startX: number;
    startY: number;
    originX: number;
    originY: number;
    pointerId: number | null;
  }>({ active: false, startX: 0, startY: 0, originX: 0, originY: 0, pointerId: null });
  const cardRef = useRef<HTMLDivElement | null>(null);

  // Reset position whenever dialog opens
  useEffect(() => {
    if (open) setDrag({ x: 0, y: 0 });
  }, [open]);

  const clampToViewport = (x: number, y: number) => {
    const el = cardRef.current;
    if (!el) return { x, y };
    const rect = el.getBoundingClientRect();
    // Keep at least 64px of the card visible on every edge so the user
    // can always grab it back / tap the skip button.
    const minVisible = 64;
    const maxX = Math.max(0, window.innerWidth  - minVisible) - rect.left + drag.x;
    const minX = -(rect.right - minVisible) + drag.x;
    const maxY = Math.max(0, window.innerHeight - minVisible) - rect.top  + drag.y;
    const minY = -(rect.bottom - minVisible) + drag.y;
    return {
      x: Math.min(maxX, Math.max(minX, x)),
      y: Math.min(maxY, Math.max(minY, y)),
    };
  };

  const onDragPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    // Only enable drag on touch/pen (mobile-ish). Desktop mouse stays static.
    if (e.pointerType === "mouse") return;
    dragStateRef.current = {
      active: true,
      startX: e.clientX,
      startY: e.clientY,
      originX: drag.x,
      originY: drag.y,
      pointerId: e.pointerId,
    };
    (e.currentTarget as HTMLDivElement).setPointerCapture(e.pointerId);
  };
  const onDragPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = dragStateRef.current;
    if (!st.active || st.pointerId !== e.pointerId) return;
    const nx = st.originX + (e.clientX - st.startX);
    const ny = st.originY + (e.clientY - st.startY);
    setDrag(clampToViewport(nx, ny));
  };
  const onDragPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    const st = dragStateRef.current;
    if (st.pointerId === e.pointerId) {
      st.active = false;
      st.pointerId = null;
      try { (e.currentTarget as HTMLDivElement).releasePointerCapture(e.pointerId); } catch { /* ignore */ }
    }
  };

  // Initial fetch + polling for admin force trigger.
  // Shows ONLY when admin clicks Force, capped at DAILY_LIMIT per browser per day,
  // inside the schedule window. Auto-show on `enabled` is intentionally removed.
  useEffect(() => {
    let cancelled = false;

    const evaluate = (row: PopupAd) => {
      if (cancelled) return;
      setAd(row);

      if (!row.youtube_video_id) return;

      const now = Date.now();
      const startsAt = row.starts_at ? new Date(row.starts_at).getTime() : null;
      const endsAt   = row.ends_at   ? new Date(row.ends_at).getTime()   : null;
      const withinWindow =
        (startsAt === null || now >= startsAt) &&
        (endsAt   === null || now <= endsAt);

      // Outside schedule window → never show, close if currently open
      if (!withinWindow) {
        if (pendingTimerRef.current) {
          window.clearTimeout(pendingTimerRef.current);
          pendingTimerRef.current = null;
          scheduledTriggerRef.current = null;
        }
        setOpen(false);
        return;
      }

      const force = row.last_force_trigger;
      if (!force) return; // no admin trigger yet → do nothing

      // Master kill switch
      if (!row.enabled) return;

      // ---- One fire per admin Force ----
      // Every time admin clicks Force Show, a new `last_force_trigger`
      // timestamp lands here. We fire the popup exactly once per trigger
      // per browser — no daily cap, no random delay. Admin force karega
      // utni baar user ko popup dikhega.
      if (open) return; // already showing
      const seen = localStorage.getItem(SEEN_FORCE_KEY);
      if (seen === force) return; // this trigger already consumed in this browser

      localStorage.setItem(SEEN_FORCE_KEY, force);
      sessionStorage.setItem(SESSION_KEY, force);
      lastSeenForceRef.current = force;
      setOpen(true);
    };

    const fetchOnce = async () => {
      const { data, error } = await supabase
        .from("popup_ads" as never)
        .select("*")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error || !data) return;
      evaluate(data as unknown as PopupAd);
    };

    fetchOnce();
    const poll = setInterval(fetchOnce, 120_000);

    return () => {
      cancelled = true;
      clearInterval(poll);
      if (pendingTimerRef.current) {
        window.clearTimeout(pendingTimerRef.current);
        pendingTimerRef.current = null;
      }
    };
  }, []);

  // Skip countdown
  useEffect(() => {
    if (!open || !ad) return;
    setCanSkip(false);
    const total = Math.max(0, ad.skip_after_seconds || 0);
    setSecondsLeft(total);
    if (total === 0) {
      setCanSkip(true);
      return;
    }
    const start = Date.now();
    const tick = setInterval(() => {
      const elapsed = Math.floor((Date.now() - start) / 1000);
      const left = Math.max(0, total - elapsed);
      setSecondsLeft(left);
      if (left <= 0) {
        setCanSkip(true);
        clearInterval(tick);
      }
    }, 250);
    return () => clearInterval(tick);
  }, [open, ad]);

  if (!ad || !ad.youtube_video_id) return null;

  const videoId = parseYouTubeId(ad.youtube_video_id);
  if (!videoId) return null;
  const isShort = resolveIsPortrait(ad.video_layout, ad.youtube_video_id);

  const handleClose = () => {
    if (!canSkip) return;
    setOpen(false);
  };

  const totalSkip = Math.max(0, ad.skip_after_seconds || 0);
  const progress = totalSkip > 0 ? 1 - secondsLeft / totalSkip : 1;
  const ringCircum = 2 * Math.PI * 18; // r=18
  const ringOffset = ringCircum * (1 - progress);

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v && !canSkip) return; // block close before skip ready
        setOpen(v);
      }}
    >
      <DialogContent
        className="w-[calc(100vw-1rem)] sm:w-[92vw] max-w-3xl max-h-[calc(100dvh-1rem)] sm:max-h-[90dvh] overflow-y-auto p-0 border-0 bg-transparent shadow-none rounded-3xl [&>button.absolute]:hidden"
        style={{
          // Respect iOS notch / Android gesture bar
          paddingTop: "max(env(safe-area-inset-top), 0px)",
          paddingBottom: "max(env(safe-area-inset-bottom), 0px)",
          paddingLeft: "max(env(safe-area-inset-left), 0px)",
          paddingRight: "max(env(safe-area-inset-right), 0px)",
        }}
        onPointerDownOutside={(e) => {
          if (!canSkip) e.preventDefault();
        }}
        onEscapeKeyDown={(e) => {
          if (!canSkip) e.preventDefault();
        }}
      >
        {/* Glow ring (outside the card) */}
        <div
          className="relative"
          style={{
            transform: `translate3d(${drag.x}px, ${drag.y}px, 0)`,
            transition: dragStateRef.current.active ? "none" : "transform 200ms ease-out",
            touchAction: "none",
            willChange: "transform",
          }}
        >
          <div
            aria-hidden
            className="absolute -inset-[2px] rounded-[22px] sm:rounded-[26px] opacity-90 blur-[6px] animate-pulse"
            style={{
              background:
                "conic-gradient(from 0deg, #f97316, #ef4444, #fb923c, #f59e0b, #f97316)",
            }}
          />
          {/* Card */}
          <div
            ref={cardRef}
            className="relative rounded-2xl sm:rounded-3xl overflow-hidden bg-gradient-to-br from-[#0b0b14] via-[#11131f] to-[#0b0b14] ring-1 ring-white/10 shadow-[0_30px_80px_-20px_rgba(249,115,22,0.45)]"
          >
            {/* Top glossy highlight */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-x-0 top-0 h-24 sm:h-32 opacity-60"
              style={{
                background:
                  "radial-gradient(60% 100% at 50% 0%, rgba(249,115,22,0.25), transparent 70%)",
              }}
            />

            {/* Mobile drag handle — touch only */}
            <div
              className="sm:hidden relative flex items-center justify-center pt-3 pb-2 cursor-grab active:cursor-grabbing select-none"
              onPointerDown={onDragPointerDown}
              onPointerMove={onDragPointerMove}
              onPointerUp={onDragPointerUp}
              onPointerCancel={onDragPointerUp}
              style={{ touchAction: "none" }}
              aria-label="Drag to reposition"
            >
              <div className="h-1 w-10 rounded-full bg-white/25" />
            </div>

            {/* Header (also draggable on mobile, excluding the skip button) */}
            <div
              className="relative flex items-center justify-between gap-3 px-4 sm:px-6 pt-3 sm:pt-5 pb-3 sm:pb-4"
              onPointerDown={(e) => {
                // Don't start a drag if the user touched the skip control
                const t = e.target as HTMLElement;
                if (t.closest("[data-no-drag]")) return;
                onDragPointerDown(e);
              }}
              onPointerMove={onDragPointerMove}
              onPointerUp={onDragPointerUp}
              onPointerCancel={onDragPointerUp}
              style={{ touchAction: "none" }}
            >
              <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
                {/* Logo badge */}
                <div className="relative shrink-0">
                  <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-orange-400 to-red-500 blur-md opacity-70 animate-pulse" />
                  <div className="relative w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-br from-orange-400 via-orange-500 to-red-500 flex items-center justify-center shadow-lg shadow-orange-500/40 ring-1 ring-white/20">
                    <Play className="w-4 h-4 sm:w-5 sm:h-5 text-white fill-white drop-shadow" />
                  </div>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-1.5 sm:gap-2 mb-1">
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] sm:text-[10px] font-extrabold tracking-[0.18em] uppercase bg-gradient-to-r from-orange-500 to-red-500 text-white shadow-sm shadow-orange-500/40">
                      <Sparkles className="w-2.5 h-2.5" /> Featured
                    </span>
                  </div>
                  <h3 className="text-[13px] sm:text-lg font-extrabold text-white leading-tight truncate tracking-tight">
                    {ad.title || "Watch this video"}
                  </h3>
                  {ad.description ? (
                    <p className="hidden sm:block text-[11px] sm:text-[12px] text-slate-300/80 mt-0.5 line-clamp-2">
                      {ad.description}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Skip control — animated ring countdown / pill */}
              <div className="shrink-0" data-no-drag>
                {canSkip ? (
                  <button
                    type="button"
                    onClick={handleClose}
                    onPointerDown={(e) => e.stopPropagation()}
                    className="group relative flex items-center gap-1.5 pl-4 sm:pl-3.5 pr-3 sm:pr-2.5 h-11 sm:h-auto sm:py-2 rounded-full text-[12px] sm:text-[11px] font-bold uppercase tracking-wider text-white bg-gradient-to-r from-orange-500/90 to-red-500/90 sm:from-white/10 sm:to-white/10 hover:from-orange-500 hover:to-red-500 sm:hover:bg-white/20 backdrop-blur-md ring-1 ring-white/25 transition-all hover:scale-[1.03] active:scale-95 shadow-lg shadow-orange-500/30 min-w-[88px] sm:min-w-[44px] justify-center"
                  >
                    <span>Skip Ad</span>
                    <span className="w-6 h-6 sm:w-5 sm:h-5 rounded-full bg-white/25 group-hover:bg-white/35 flex items-center justify-center transition-colors">
                      <X className="w-3.5 h-3.5 sm:w-3 sm:h-3" />
                    </span>
                  </button>
                ) : (
                  <div className="relative w-12 h-12 sm:w-12 sm:h-12 flex items-center justify-center" onPointerDown={(e) => e.stopPropagation()}>
                    {/* Progress ring */}
                    <svg className="absolute inset-0 -rotate-90" viewBox="0 0 40 40">
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        stroke="rgba(255,255,255,0.10)"
                        strokeWidth="3"
                        fill="none"
                      />
                      <circle
                        cx="20"
                        cy="20"
                        r="18"
                        stroke="url(#popupAdRing)"
                        strokeWidth="3"
                        strokeLinecap="round"
                        fill="none"
                        strokeDasharray={ringCircum}
                        strokeDashoffset={ringOffset}
                        style={{ transition: "stroke-dashoffset 250ms linear" }}
                      />
                      <defs>
                        <linearGradient id="popupAdRing" x1="0" y1="0" x2="1" y2="1">
                          <stop offset="0%" stopColor="#fb923c" />
                          <stop offset="100%" stopColor="#ef4444" />
                        </linearGradient>
                      </defs>
                    </svg>
                    <span className="relative text-[11px] sm:text-[12px] font-extrabold text-white tabular-nums drop-shadow">
                      {secondsLeft}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {/* Divider */}
            <div className="mx-4 sm:mx-6 h-px bg-gradient-to-r from-transparent via-white/15 to-transparent" />

            {/* Video frame with inner glow */}
            <div className="px-3 py-3 sm:p-4">
              <div
                className={`relative ${isShort ? "mx-auto w-full max-w-[320px] sm:max-w-[360px]" : "w-full"} rounded-xl sm:rounded-2xl overflow-hidden bg-black ring-1 ring-white/10 shadow-[0_20px_50px_-15px_rgba(0,0,0,0.7)]`}
                style={{ aspectRatio: isShort ? "9 / 16" : "16 / 9" }}
              >
                {/* corner accents */}
                <div className="pointer-events-none absolute top-0 left-0 w-10 h-10 sm:w-16 sm:h-16 border-t-2 border-l-2 border-orange-400/40 rounded-tl-xl sm:rounded-tl-2xl z-10" />
                <div className="pointer-events-none absolute bottom-0 right-0 w-10 h-10 sm:w-16 sm:h-16 border-b-2 border-r-2 border-red-500/40 rounded-br-xl sm:rounded-br-2xl z-10" />
                <iframe
                  key={videoId + (ad.last_force_trigger || "")}
                  src={`https://www.youtube.com/embed/${videoId}?autoplay=1&mute=1&rel=0&modestbranding=1&playsinline=1&controls=1`}
                  title={ad.title || "Advertisement"}
                  className="absolute inset-0 w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            </div>

            {/* Footer */}
            <div className="relative px-3 sm:px-6 pb-3 sm:pb-4 pt-1 flex items-center justify-between gap-2 sm:gap-3">
              <div className="flex items-center gap-2 text-[10px] sm:text-[11px] text-slate-400 min-w-0">
                <span className="w-1.5 h-1.5 rounded-full bg-orange-400 animate-pulse" />
                <span className="font-semibold tracking-wider uppercase truncate">FlexiPro Promo</span>
              </div>
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-300 shrink-0">
                {canSkip ? (
                  <span className="text-blue-400">Close now ✓</span>
                ) : (
                  <span>
                    Skip in{" "}
                    <span className="text-orange-300 font-bold tabular-nums">
                      {secondsLeft}s
                    </span>
                  </span>
                )}
              </span>
            </div>

            {/* Bottom progress bar */}
            {!canSkip && totalSkip > 0 && (
              <div className="h-1 w-full bg-white/5 overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-orange-400 via-red-500 to-orange-400 transition-[width] duration-250 ease-linear"
                  style={{ width: `${Math.min(100, Math.max(0, progress * 100))}%` }}
                />
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}

export default PopupAdDialog;