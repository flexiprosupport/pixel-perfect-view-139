import { useEffect, useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Save, Zap, Play, Megaphone, ExternalLink, CalendarClock } from "lucide-react";

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

function parseYouTubeId(input: string): string {
  const s = (input || "").trim();
  if (!s) return "";
  if (/^[a-zA-Z0-9_-]{6,20}$/.test(s)) return s;
  try {
    const url = new URL(s.startsWith("http") ? s : `https://${s}`);
    const v = url.searchParams.get("v");
    if (v) return v;
    const parts = url.pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  } catch {
    return s;
  }
}

/** ISO string -> "YYYY-MM-DDTHH:mm" in local TZ (for datetime-local input). */
function isoToLocalInput(iso: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** datetime-local string (local TZ) -> ISO. Empty string -> null. */
function localInputToIso(value: string): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return d.toISOString();
}

function ScheduleStatus({ startsAt, endsAt }: { startsAt: string; endsAt: string }) {
  const now = Date.now();
  const s = startsAt ? new Date(startsAt).getTime() : null;
  const e = endsAt ? new Date(endsAt).getTime() : null;
  if (!s && !e) {
    return <p className="text-[11px] text-muted-foreground">No schedule set — popup is always available.</p>;
  }
  if (s && now < s) {
    return <p className="text-[11px] text-amber-600 font-semibold">⏳ Scheduled — starts {new Date(s).toLocaleString()}</p>;
  }
  if (e && now > e) {
    return <p className="text-[11px] text-red-600 font-semibold">⛔ Expired on {new Date(e).toLocaleString()} — popup will not show.</p>;
  }
  return (
    <p className="text-[11px] text-green-600 font-semibold">
      ✅ Active{e ? ` until ${new Date(e).toLocaleString()}` : ""}
    </p>
  );
}

export default function AdminPopupAd() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [forcing, setForcing] = useState(false);
  const [row, setRow] = useState<PopupAd | null>(null);
  const [videoInput, setVideoInput] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [skipSec, setSkipSec] = useState(5);
  const [startsAt, setStartsAt] = useState<string>(""); // datetime-local
  const [endsAt, setEndsAt] = useState<string>("");     // datetime-local
  const [videoLayout, setVideoLayout] = useState<"auto" | "landscape" | "portrait">("auto");

  const load = async () => {
    setLoading(true);
    const { data, error } = await supabase
      .from("popup_ads" as never)
      .select("*")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (!data) {
      const { data: inserted, error: insErr } = await supabase
        .from("popup_ads" as never)
        .insert({ youtube_video_id: "", title: "Watch this video" } as never)
        .select("*")
        .single();
      if (insErr) {
        toast.error(insErr.message);
        setLoading(false);
        return;
      }
      const r = inserted as unknown as PopupAd;
      setRow(r);
      setVideoInput(r.youtube_video_id);
      setTitle(r.title);
      setDescription(r.description || "");
      setEnabled(r.enabled);
      setSkipSec(r.skip_after_seconds);
      setStartsAt(isoToLocalInput(r.starts_at));
      setEndsAt(isoToLocalInput(r.ends_at));
      setVideoLayout((r.video_layout as "auto" | "landscape" | "portrait") || "auto");
    } else {
      const r = data as unknown as PopupAd;
      setRow(r);
      setVideoInput(r.youtube_video_id);
      setTitle(r.title);
      setDescription(r.description || "");
      setEnabled(r.enabled);
      setSkipSec(r.skip_after_seconds);
      setStartsAt(isoToLocalInput(r.starts_at));
      setEndsAt(isoToLocalInput(r.ends_at));
      setVideoLayout((r.video_layout as "auto" | "landscape" | "portrait") || "auto");
    }
    setLoading(false);
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (opts?: { bumpVersion?: boolean; force?: boolean }) => {
    if (!row) return;
    setSaving(true);
    const videoId = parseYouTubeId(videoInput);
    const startIso = localInputToIso(startsAt);
    const endIso   = localInputToIso(endsAt);
    if (startIso && endIso && new Date(endIso).getTime() <= new Date(startIso).getTime()) {
      setSaving(false);
      toast.error("End time must be after start time");
      return;
    }
    const update: Record<string, unknown> = {
      youtube_video_id: videoId,
      title: title.trim() || "Watch this video",
      description: description.trim(),
      enabled,
      skip_after_seconds: Math.max(0, Math.min(120, Math.floor(skipSec || 0))),
      starts_at: startIso,
      ends_at: endIso,
      video_layout: videoLayout,
    };
    if (opts?.bumpVersion) {
      update.version = (row.version || 1) + 1;
    }
    if (opts?.force) {
      update.last_force_trigger = new Date().toISOString();
    }
    const { data, error } = await supabase
      .from("popup_ads" as never)
      .update(update as never)
      .eq("id", row.id)
      .select("*")
      .single();
    setSaving(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    const r = data as unknown as PopupAd;
    setRow(r);
    setVideoInput(r.youtube_video_id);
    toast.success(opts?.force ? "Popup forced for all users!" : "Saved");
  };

  const forceTrigger = async () => {
    if (!row) return;
    if (!parseYouTubeId(videoInput)) {
      toast.error("Add a YouTube video first");
      return;
    }
    setForcing(true);
    await save({ bumpVersion: true, force: true });
    setForcing(false);
  };

  const previewId = parseYouTubeId(videoInput);

  return (
    <DashboardLayout>
      <div className="space-y-6 px-2 sm:px-4 lg:px-6 pb-8">
        <div className="glass-card p-6 bg-gradient-to-br from-red-500/10 via-transparent to-orange-500/10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center shadow-xl shadow-red-500/20">
              <Megaphone className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold">Popup Ad Manager</h1>
              <p className="text-sm text-muted-foreground">
                Show a YouTube video popup on the engagement pages — automatically or on-demand
              </p>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
          </div>
        ) : (
          <div className="grid lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Play className="w-5 h-5 text-red-500" />
                  Ad Settings
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-5">
                <div className="space-y-2">
                  <Label>YouTube Video URL or ID</Label>
                  <Input
                    placeholder="https://www.youtube.com/watch?v=XXXXXX or just XXXXXX"
                    value={videoInput}
                    onChange={(e) => setVideoInput(e.target.value)}
                  />
                  {previewId ? (
                    <p className="text-[11px] text-muted-foreground flex items-center gap-1">
                      Parsed ID: <code className="font-mono">{previewId}</code>
                      <a
                        href={`https://youtu.be/${previewId}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-primary inline-flex items-center gap-0.5 hover:underline"
                      >
                        Open <ExternalLink className="w-3 h-3" />
                      </a>
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-600">Enter a valid YouTube link or ID</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label>Title (shown above video)</Label>
                  <Input value={title} onChange={(e) => setTitle(e.target.value)} />
                </div>

                <div className="space-y-2">
                  <Label>Description (optional)</Label>
                  <Textarea
                    rows={2}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Skip button delay (seconds)</Label>
                  <Input
                    type="number"
                    min={0}
                    max={120}
                    value={skipSec}
                    onChange={(e) => setSkipSec(Number(e.target.value))}
                  />
                  <p className="text-[11px] text-muted-foreground">
                    User can't close the popup until this many seconds pass
                  </p>
                </div>

                <div className="space-y-2">
                  <Label>Video layout</Label>
                  <div className="grid grid-cols-3 gap-2">
                    {(["auto","landscape","portrait"] as const).map((opt) => (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => setVideoLayout(opt)}
                        className={`px-3 py-2 rounded-lg border text-xs font-semibold capitalize transition-colors ${
                          videoLayout === opt
                            ? "bg-gradient-to-r from-red-500 to-orange-500 text-white border-transparent shadow"
                            : "bg-background hover:bg-muted"
                        }`}
                      >
                        {opt === "auto" ? "Auto" : opt === "landscape" ? "Long (16:9)" : "Short (9:16)"}
                      </button>
                    ))}
                  </div>
                  <p className="text-[11px] text-muted-foreground">
                    Auto detects from URL. Choose <strong>Long (16:9)</strong> to force landscape player even for a Shorts URL.
                  </p>
                </div>

                <div className="flex items-center justify-between p-3 rounded-xl border bg-muted/30">
                  <div>
                    <p className="text-sm font-semibold">Auto-show on engagement pages</p>
                    <p className="text-[11px] text-muted-foreground">
                      Every user sees it once per browser session (until you change the video / bump it)
                    </p>
                  </div>
                  <Switch checked={enabled} onCheckedChange={setEnabled} />
                </div>

                {/* Schedule window */}
                <div className="p-3 rounded-xl border bg-muted/30 space-y-3">
                  <div className="flex items-center gap-2">
                    <CalendarClock className="w-4 h-4 text-orange-500" />
                    <p className="text-sm font-semibold">Schedule (optional)</p>
                  </div>
                  <p className="text-[11px] text-muted-foreground -mt-1">
                    Popup will only show between these times. Leave empty for no limit. Outside the window even Force Show won't fire.
                  </p>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <div className="space-y-1.5">
                      <Label className="text-xs">Starts at</Label>
                      <Input
                        type="datetime-local"
                        value={startsAt}
                        onChange={(e) => setStartsAt(e.target.value)}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-xs">Ends at (expiry)</Label>
                      <Input
                        type="datetime-local"
                        value={endsAt}
                        onChange={(e) => setEndsAt(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => { setStartsAt(""); setEndsAt(""); }}
                      className="text-[11px] px-2 py-1 rounded-md border bg-background hover:bg-muted"
                    >
                      Clear schedule
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const end = new Date(Date.now() + 24 * 60 * 60 * 1000);
                        setStartsAt(isoToLocalInput(new Date().toISOString()));
                        setEndsAt(isoToLocalInput(end.toISOString()));
                      }}
                      className="text-[11px] px-2 py-1 rounded-md border bg-background hover:bg-muted"
                    >
                      Next 24h
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const end = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);
                        setStartsAt(isoToLocalInput(new Date().toISOString()));
                        setEndsAt(isoToLocalInput(end.toISOString()));
                      }}
                      className="text-[11px] px-2 py-1 rounded-md border bg-background hover:bg-muted"
                    >
                      Next 7 days
                    </button>
                  </div>
                  <ScheduleStatus startsAt={startsAt} endsAt={endsAt} />
                </div>

                <div className="flex flex-col sm:flex-row gap-3 pt-2">
                  <Button
                    onClick={() => save({ bumpVersion: true })}
                    disabled={saving}
                    className="flex-1"
                  >
                    {saving ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Save className="w-4 h-4" />
                    )}
                    Save Changes
                  </Button>
                  <Button
                    onClick={forceTrigger}
                    disabled={forcing || saving}
                    variant="destructive"
                    className="flex-1 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600"
                  >
                    {forcing ? (
                      <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                      <Zap className="w-4 h-4" />
                    )}
                    Force Show Now
                  </Button>
                </div>

                {row?.last_force_trigger && (
                  <p className="text-[11px] text-muted-foreground">
                    Last forced: {new Date(row.last_force_trigger).toLocaleString()}
                  </p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {previewId ? (
                  <div className="relative w-full rounded-xl overflow-hidden border" style={{ aspectRatio: "16 / 9" }}>
                    <iframe
                      src={`https://www.youtube.com/embed/${previewId}?rel=0&modestbranding=1`}
                      className="absolute inset-0 w-full h-full"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="Preview"
                    />
                  </div>
                ) : (
                  <div className="aspect-video rounded-xl border border-dashed flex items-center justify-center text-sm text-muted-foreground">
                    Add a YouTube video to preview
                  </div>
                )}
                <div className="mt-4 p-3 rounded-xl bg-muted/30 text-xs space-y-1.5">
                  <p><strong>How it works (admin-controlled):</strong></p>
                  <p>• Popup is <strong>fully manual</strong> — it only shows after you click <strong>Force Show Now</strong>.</p>
                  <p>• <strong>Enable popup</strong> is the master kill switch. If it's OFF, even Force Show won't fire.</p>
                  <p>• Every Force Show = <strong>1 popup per user</strong>. Jitni baar Force karoge, utni baar har user ko popup dikhega (next time they open the app).</p>
                  <p>• No daily cap — admin fully controls frequency by clicking Force.</p>
                  <p>• Only fires inside the schedule window (Starts at / Ends at). Outside the window nothing shows.</p>
                  <p>• Users can only skip after the delay you set above.</p>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}