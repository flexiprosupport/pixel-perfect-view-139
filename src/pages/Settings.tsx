import { useState, useEffect, useRef } from 'react';
import { useNavigate } from "@/lib/router-compat";
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { PageMeta } from '@/components/seo/PageMeta';
import {
  User,
  Mail,
  Key,
  Shield,
  Loader2,
  Save,
  Eye,
  EyeOff,
  RefreshCw,
  Copy,
  Check,
  Settings as SettingsIcon,
  LogOut,
  Brain,
  Zap,
  Percent,
  Sparkles,
  Info,
  Camera,
} from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';

export default function Settings() {
  const navigate = useNavigate();
  const { user, profile, isLoading: authLoading, refreshProfile, signOut } = useAuth();
  const { toast } = useToast();

  // Profile form state
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [copiedApi, setCopiedApi] = useState(false);
  const photoInputRef = useRef<HTMLInputElement>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPasswords, setShowPasswords] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Organic settings state
  const [isOrganicMode, setIsOrganicMode] = useState(false);
  const [ratios, setRatios] = useState({
    views: 100,
    likes: 5,
    comments: 2,
    saves: 1,
    shares: 1,
    reposts: 0.5,
    followers: 2,
    subscribers: 3,
    watch_hours: 5,
    retweets: 4,
  });

  const RATIO_META: Record<string, { label: string; emoji: string; platform: string[] }> = {
    views: { label: 'Views', emoji: '👁️', platform: ['instagram', 'tiktok', 'youtube', 'twitter', 'facebook'] },
    likes: { label: 'Likes', emoji: '❤️', platform: ['instagram', 'tiktok', 'youtube', 'twitter', 'facebook'] },
    comments: { label: 'Comments', emoji: '💬', platform: ['instagram', 'tiktok', 'youtube', 'twitter', 'facebook'] },
    saves: { label: 'Saves', emoji: '📥', platform: ['instagram', 'tiktok'] },
    shares: { label: 'Shares', emoji: '🔄', platform: ['instagram', 'tiktok', 'facebook'] },
    reposts: { label: 'Reposts', emoji: '🔁', platform: ['instagram', 'tiktok'] },
    followers: { label: 'Followers', emoji: '👥', platform: ['instagram', 'tiktok', 'twitter', 'facebook'] },
    subscribers: { label: 'Subscribers', emoji: '🔔', platform: ['youtube'] },
    watch_hours: { label: 'Watch Hours', emoji: '⏱️', platform: ['youtube'] },
    retweets: { label: 'Retweets', emoji: '🔃', platform: ['twitter'] },
  };

  // No loading states needed for optimistic UI

  // Load the customer's personal API key (stored separately from the profile)
  useEffect(() => {
    if (!user?.id) return;
    let cancelled = false;
    supabase
      .from('user_api_keys')
      .select('api_key')
      .eq('user_id', user.id)
      .maybeSingle()
      .then(({ data }) => {
        if (!cancelled && data?.api_key) setApiKey(data.api_key);
      });
    return () => { cancelled = true; };
  }, [user?.id]);

  // Load profile data + organic settings from localStorage
  useEffect(() => {
    if (profile) {
      setFullName(profile.full_name || '');
      setEmail(profile.email || '');
      
      setAvatarUrl((profile as any).avatar_url || null);
    }
    // Load organic settings from localStorage
    try {
      const savedOrganic = localStorage.getItem('organic_settings');
      if (savedOrganic) {
        const parsed = JSON.parse(savedOrganic);
        setIsOrganicMode(parsed.isOrganicMode ?? false);
        if (parsed.ratios) setRatios(parsed.ratios);
      }
    } catch { /* ignore parse errors */ }
  }, [profile]);

  // Handle photo upload
  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Max 2MB allowed', variant: 'destructive' });
      return;
    }

    setUploadingPhoto(true);
    try {
      // Upload to Supabase Storage (avatars bucket)
      const ext = file.name.split('.').pop();
      const path = `${user.id}/avatar.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(path, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(path);
      const publicUrl = urlData.publicUrl + '?t=' + Date.now();

      // Save URL to profile
      const { error: updateError } = await (supabase as any)
        .from('profiles')
        .update({ avatar_url: publicUrl, updated_at: new Date().toISOString() })
        .eq('user_id', user.id);

      if (updateError) throw updateError;

      setAvatarUrl(publicUrl);
      toast({ title: '📸 Photo Updated!', description: 'Profile photo saved successfully.' });
      refreshProfile();
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message || 'Could not upload photo', variant: 'destructive' });
    } finally {
      setUploadingPhoto(false);
    }
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !user) {
      navigate('/auth');
    }
  }, [user, authLoading, navigate]);

  const handleSaveProfile = () => {
    if (!user) return;
    setIsSaving(true);

    // Save organic settings to localStorage (DB columns may not exist yet)
    try {
      localStorage.setItem('organic_settings', JSON.stringify({
        isOrganicMode,
        ratios,
      }));
    } catch { /* ignore storage errors */ }

    // Only update fields that exist in the DB
    supabase
      .from('profiles')
      .update({
        full_name: fullName.trim(),
        updated_at: new Date().toISOString(),
      })
      .eq('user_id', user.id)
      .then(({ error }) => {
        setIsSaving(false);
        if (error) {
          toast({
            title: "Error",
            description: "Failed to update profile",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Settings Saved",
            description: "Your preferences have been updated successfully.",
          });
        }
        refreshProfile();
      });
  };

  const updateRatio = (key: keyof typeof ratios, value: number) => {
    setRatios(prev => ({ ...prev, [key]: value }));
  };

  const handleChangePassword = () => {
    if (!newPassword || !confirmPassword) {
      toast({
        title: "Error",
        description: "Please fill in all password fields",
        variant: "destructive",
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        title: "Error",
        description: "New passwords do not match",
        variant: "destructive",
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        title: "Error",
        description: "Password must be at least 6 characters",
        variant: "destructive",
      });
      return;
    }

    // 🚀 INSTANT: Show success and clear form immediately
    toast({
      title: "Password Changed",
      description: "Your password has been updated successfully.",
    });
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    // Fire-and-forget: Process in background
    supabase.auth.updateUser({
      password: newPassword,
    }).then(({ error }) => {
      if (error) {
        toast({
          title: "Error",
          description: "Password update failed: " + error.message,
          variant: "destructive",
        });
      }
    });
  };

  const generateApiKey = async () => {
    if (!user) return;

    const { data, error } = await supabase.rpc('rotate_my_api_key' as any);

    if (error || !data) {
      toast({
        title: "Error",
        description: error?.message || "Failed to generate API key",
        variant: "destructive",
      });
      return;
    }

    setApiKey(data as unknown as string);
    toast({
      title: "API Key Generated",
      description: "Your new API key has been created. Keep it safe!",
    });
  };

  const copyApiKey = async () => {
    if (apiKey) {
      await navigator.clipboard.writeText(apiKey);
      setCopiedApi(true);
      setTimeout(() => setCopiedApi(false), 2000);
      toast({
        title: "Copied",
        description: "API key copied to clipboard",
      });
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/auth');
  };

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <PageMeta title="Account Settings" description="Update your FlexiPro profile, password, currency, and preferences." canonicalPath="/settings" noIndex />
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6 pb-8">
        {/* Header */}
        <div className="relative overflow-hidden glass-card p-6 sm:p-8 bg-gradient-to-r from-primary/5 via-transparent to-primary/10">
          <div className="relative z-10">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center shadow-lg">
                <SettingsIcon className="h-6 w-6 text-primary-foreground" />
              </div>
              <div>
                <h1 className="text-2xl sm:text-3xl font-bold text-foreground">Settings</h1>
                <p className="text-sm text-muted-foreground">Manage your account and preferences</p>
              </div>
            </div>
          </div>
          <div className="absolute top-0 right-0 w-40 h-40 bg-gradient-to-bl from-primary/10 to-transparent rounded-full blur-3xl" />
        </div>

        {/* Profile Settings */}
        <Card className="glass-card border-2 border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                <User className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>Update your personal details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            {/* Profile Photo */}
            <div className="flex items-center gap-5">
              <div className="relative shrink-0">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="w-20 h-20 rounded-2xl object-cover border-2 border-primary/30 shadow-lg"
                  />
                ) : (
                  <div className="w-20 h-20 rounded-2xl bg-primary/10 border-2 border-primary/20 flex items-center justify-center">
                    <User className="h-8 w-8 text-primary/50" />
                  </div>
                )}
                <button
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute -bottom-2 -right-2 w-7 h-7 rounded-full bg-primary flex items-center justify-center shadow-lg hover:bg-primary/90 transition-colors border-2 border-background"
                >
                  {uploadingPhoto
                    ? <Loader2 className="h-3 w-3 text-white animate-spin" />
                    : <Camera className="h-3 w-3 text-white" />}
                </button>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handlePhotoUpload}
                />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">{fullName || 'Your Name'}</p>
                <p className="text-xs text-muted-foreground mb-2">{email}</p>
                <button
                  onClick={() => photoInputRef.current?.click()}
                  className="text-xs text-primary hover:underline font-medium"
                >
                  {avatarUrl ? 'Change photo' : 'Upload photo'}
                </button>
              </div>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fullName" className="text-sm font-medium">Full Name</Label>
                <Input
                  id="fullName"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder="Enter your name"
                  className="h-11 rounded-xl border-2 border-border focus:border-primary"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="text-sm font-medium">Email Address</Label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="email"
                    value={email}
                    disabled
                    className="h-11 pl-10 rounded-xl border-2 border-border bg-muted/50"
                  />
                </div>
                <p className="text-xs text-muted-foreground">Email cannot be changed</p>
              </div>
            </div>
            <Button
              onClick={handleSaveProfile}
              className="h-11 px-6 rounded-xl bg-gradient-to-r from-primary to-primary/80"
            >
              <Save className="h-4 w-4 mr-2" />
              Save Changes
            </Button>
          </CardContent>
        </Card>

        {/* AI Automation Settings */}
        <Card className="glass-card border-2 border-primary/40 bg-gradient-to-br from-primary/5 to-transparent overflow-hidden">
          <CardHeader className="relative">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center shadow-lg shadow-primary/10">
                  <Brain className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <CardTitle className="flex items-center gap-2 text-foreground">
                    AI Organic Automation
                    <Badge variant="secondary" className="bg-primary/20 text-primary text-[10px] font-bold uppercase tracking-wider">PREMIUM</Badge>
                  </CardTitle>
                  <CardDescription>Configure your default organic settings</CardDescription>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-secondary/50 p-1.5 rounded-2xl border border-border">
                <span className={cn(
                  "text-[10px] font-bold uppercase px-2 py-1 rounded-lg transition-all",
                  isOrganicMode ? "text-success bg-success/10" : "text-muted-foreground"
                )}>
                  {isOrganicMode ? "Enabled" : "Disabled"}
                </span>
                <Switch
                  checked={isOrganicMode}
                  onCheckedChange={setIsOrganicMode}
                  className="data-[state=checked]:bg-success"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="p-4 rounded-2xl bg-secondary/30 border border-primary/20 flex gap-4 items-start">
              <div className="p-2 bg-primary/10 rounded-lg">
                <Sparkles className="h-4 w-4 text-primary" />
              </div>
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-foreground">What is Organic Mode?</h4>
                <p className="text-xs text-muted-foreground leading-relaxed">
                  When enabled, all your new orders will automatically use AI-generated delivery patterns.
                  This creates unique growth curves for every order to look 100% natural to social algorithms.
                </p>
              </div>
            </div>

            <div className="space-y-6">
              {/* Universal Ratios */}
              <div className="flex items-center gap-2 mb-2">
                <Percent className="h-4 w-4 text-primary" />
                <h3 className="text-sm font-bold text-foreground">AI Organic Ratios — Universal</h3>
                <Badge variant="secondary" className="bg-primary/10 text-primary text-[9px] uppercase tracking-wider">All Platforms</Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(ratios).filter(([key]) => ['views', 'likes', 'comments'].includes(key)).map(([key, value]) => {
                  const meta = RATIO_META[key];
                  return (
                    <div key={key} className="space-y-3 p-4 rounded-2xl bg-background/50 border border-border group hover:border-primary/30 transition-all">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-primary transition-colors flex items-center gap-1.5">
                          <span>{meta?.emoji}</span> {meta?.label || key} Ratio
                        </Label>
                        <span className="text-lg font-mono font-bold text-primary">{value}%</span>
                      </div>
                      <div className="px-1">
                        <Slider value={[value]} onValueChange={([val]) => updateRatio(key as any, val)} max={100} step={1} className="py-4" />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground/60"><span>0%</span><span>50%</span><span>100%</span></div>
                    </div>
                  );
                })}
              </div>

              {/* Instagram + TikTok Ratios */}
              <div className="flex items-center gap-2 mt-6 mb-2">
                <span className="text-base">📸</span>
                <h3 className="text-sm font-bold text-foreground">Instagram & TikTok</h3>
                <Badge variant="secondary" className="bg-green-500/10 text-green-400 text-[9px] uppercase tracking-wider">IG + TT</Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {Object.entries(ratios).filter(([key]) => ['saves', 'shares', 'reposts', 'followers'].includes(key)).map(([key, value]) => {
                  const meta = RATIO_META[key];
                  return (
                    <div key={key} className="space-y-3 p-4 rounded-2xl bg-background/50 border border-border group hover:border-green-500/30 transition-all">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-green-400 transition-colors flex items-center gap-1.5">
                          <span>{meta?.emoji}</span> {meta?.label || key}
                        </Label>
                        <span className="text-lg font-mono font-bold text-green-400">{value}%</span>
                      </div>
                      <div className="px-1">
                        <Slider value={[value]} onValueChange={([val]) => updateRatio(key as any, val)} max={100} step={1} className="py-4" />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground/60"><span>0%</span><span>50%</span><span>100%</span></div>
                    </div>
                  );
                })}
              </div>

              {/* YouTube Ratios */}
              <div className="flex items-center gap-2 mt-6 mb-2">
                <span className="text-base">🎬</span>
                <h3 className="text-sm font-bold text-foreground">YouTube</h3>
                <Badge variant="secondary" className="bg-red-500/10 text-red-400 text-[9px] uppercase tracking-wider">YT</Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(ratios).filter(([key]) => ['subscribers', 'watch_hours'].includes(key)).map(([key, value]) => {
                  const meta = RATIO_META[key];
                  return (
                    <div key={key} className="space-y-3 p-4 rounded-2xl bg-background/50 border border-border group hover:border-red-500/30 transition-all">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-red-400 transition-colors flex items-center gap-1.5">
                          <span>{meta?.emoji}</span> {meta?.label || key}
                        </Label>
                        <span className="text-lg font-mono font-bold text-red-400">{value}%</span>
                      </div>
                      <div className="px-1">
                        <Slider value={[value]} onValueChange={([val]) => updateRatio(key as any, val)} max={100} step={1} className="py-4" />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground/60"><span>0%</span><span>50%</span><span>100%</span></div>
                    </div>
                  );
                })}
              </div>

              {/* Twitter Ratios */}
              <div className="flex items-center gap-2 mt-6 mb-2">
                <span className="text-base">🐦</span>
                <h3 className="text-sm font-bold text-foreground">Twitter / X</h3>
                <Badge variant="secondary" className="bg-sky-500/10 text-sky-400 text-[9px] uppercase tracking-wider">X</Badge>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                {Object.entries(ratios).filter(([key]) => ['retweets'].includes(key)).map(([key, value]) => {
                  const meta = RATIO_META[key];
                  return (
                    <div key={key} className="space-y-3 p-4 rounded-2xl bg-background/50 border border-border group hover:border-sky-500/30 transition-all">
                      <div className="flex justify-between items-center">
                        <Label className="text-xs font-bold uppercase tracking-wider text-muted-foreground group-hover:text-sky-400 transition-colors flex items-center gap-1.5">
                          <span>{meta?.emoji}</span> {meta?.label || key}
                        </Label>
                        <span className="text-lg font-mono font-bold text-sky-400">{value}%</span>
                      </div>
                      <div className="px-1">
                        <Slider value={[value]} onValueChange={([val]) => updateRatio(key as any, val)} max={100} step={1} className="py-4" />
                      </div>
                      <div className="flex justify-between text-[10px] text-muted-foreground/60"><span>0%</span><span>50%</span><span>100%</span></div>
                    </div>
                  );
                })}
              </div>

              <div className="flex items-center gap-3 p-3 rounded-xl bg-primary/5 text-primary">
                <Info className="h-4 w-4 shrink-0" />
                <p className="text-[11px] font-medium">
                  Ratios are calculated relative to your "Base Quantity". For example, if Views are 100% and Likes are 5%, an order of 10,000 Views will auto-generate 500 Likes. These apply to ALL your orders across all platforms.
                </p>
              </div>
            </div>

            <Button
              onClick={handleSaveProfile}
              disabled={isSaving}
              className="w-full h-12 rounded-xl bg-gradient-to-r from-primary to-primary/80 shadow-lg shadow-primary/20 font-bold"
            >
              {isSaving ? <Loader2 className="h-5 w-5 animate-spin mr-2" /> : <Save className="h-5 w-5 mr-2" />}
              Save AI Configuration
            </Button>
          </CardContent>
        </Card>

        {/* Password Change */}
        <Card className="glass-card border-2 border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-warning" />
              </div>
              <div>
                <CardTitle>Change Password</CardTitle>
                <CardDescription>Update your account password</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="newPassword" className="text-sm font-medium">New Password</Label>
                <div className="relative">
                  <Input
                    id="newPassword"
                    type={showPasswords ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="Enter new password"
                    className="h-11 pr-10 rounded-xl border-2 border-border focus:border-primary"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPasswords(!showPasswords)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPasswords ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="confirmPassword" className="text-sm font-medium">Confirm New Password</Label>
                <Input
                  id="confirmPassword"
                  type={showPasswords ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Confirm new password"
                  className="h-11 rounded-xl border-2 border-border focus:border-primary"
                />
              </div>
            </div>
            <Button
              onClick={handleChangePassword}
              disabled={!newPassword || !confirmPassword}
              variant="outline"
              className="h-11 px-6 rounded-xl border-2"
            >
              <Key className="h-4 w-4 mr-2" />
              Change Password
            </Button>
          </CardContent>
        </Card>

        {/* API Key */}
        <Card className="glass-card border-2 border-border">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-success/10 flex items-center justify-center">
                <Key className="h-5 w-5 text-success" />
              </div>
              <div>
                <CardTitle>API Key</CardTitle>
                <CardDescription>Manage your API access key for integrations</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="space-y-2">
              <Label className="text-sm font-medium">Your API Key</Label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Input
                    value={apiKey || 'No API key generated'}
                    readOnly
                    type={showApiKey ? "text" : "password"}
                    className="h-11 pr-10 rounded-xl border-2 border-border bg-muted/50 font-mono text-sm"
                  />
                  {apiKey && (
                    <button
                      type="button"
                      onClick={() => setShowApiKey(!showApiKey)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                    >
                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  )}
                </div>
                {apiKey && (
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={copyApiKey}
                    className="h-11 w-11 rounded-xl border-2"
                  >
                    {copiedApi ? <Check className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
                  </Button>
                )}
              </div>
              <p className="text-xs text-muted-foreground">
                Keep your API key secret. Do not share it publicly.
              </p>
            </div>
            <Button
              onClick={generateApiKey}
              variant="outline"
              className="h-11 px-6 rounded-xl border-2"
            >
              <RefreshCw className="h-4 w-4 mr-2" />
              {apiKey ? 'Regenerate API Key' : 'Generate API Key'}
            </Button>
          </CardContent>
        </Card>

        {/* Sign Out */}
        <Card className="glass-card border-2 border-destructive/30">
          <CardContent className="p-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-foreground">Sign Out</h3>
                <p className="text-sm text-muted-foreground">Sign out from your account on this device</p>
              </div>
              <Button
                variant="destructive"
                onClick={handleSignOut}
                className="h-11 px-6 rounded-xl"
              >
                <LogOut className="h-4 w-4 mr-2" />
                Sign Out
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
