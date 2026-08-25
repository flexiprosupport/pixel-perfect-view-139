import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  CreditCard,
  Search,
  Loader2,
  ArrowLeft,
  CheckCircle2,
  XCircle,
  Clock,
  Phone,
  Mail,
  User,
  Calendar,
  Crown,
  Zap,
  MessageSquare,
  UserPlus,
  Trash2,
  Users,
  AlertCircle,
} from 'lucide-react';
import { Link, Navigate } from "@/lib/router-compat";
import { toast } from 'sonner';
import { format, formatDistanceToNow } from 'date-fns';

interface SubscriptionRequest {
  id: string;
  user_id: string;
  full_name: string;
  email: string;
  phone: string;
  plan_type: 'monthly' | 'lifetime';
  message: string | null;
  status: 'pending' | 'approved' | 'rejected';
  reviewed_at: string | null;
  admin_notes: string | null;
  created_at: string;
}

interface Subscription {
  id: string;
  user_id: string;
  plan_type: 'none' | 'monthly' | 'lifetime';
  status: 'inactive' | 'active' | 'expired' | 'cancelled';
  activated_at: string | null;
  expires_at: string | null;
  created_at: string;
}

interface Profile {
  user_id: string;
  email: string;
  full_name: string | null;
}

export default function AdminSubscriptions() {
  const { user, isAdmin, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('subscribers');
  const [requestTab, setRequestTab] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState<SubscriptionRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState('');
  const [actionType, setActionType] = useState<'approve' | 'reject'>('approve');

  // Add subscriber state
  const [addEmail, setAddEmail] = useState('');
  const [addPlanType, setAddPlanType] = useState<'monthly' | 'lifetime'>('monthly');
  const [removeDialog, setRemoveDialog] = useState<{ userId: string; email: string } | null>(null);

  // Fetch active subscribers with profile info
  const { data: subscribers, isLoading: loadingSubscribers } = useQuery({
    queryKey: ['admin-active-subscribers'],
    queryFn: async () => {
      const { data: subs, error: subsError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('status', 'active')
        .order('activated_at', { ascending: false });

      if (subsError) throw subsError;

      // Fetch profile info for each subscriber
      const userIds = subs.map(s => s.user_id);
      const { data: profiles, error: profilesError } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .in('user_id', userIds);

      if (profilesError) throw profilesError;

      return subs.map(sub => ({
        ...sub,
        profile: profiles?.find(p => p.user_id === sub.user_id) || null,
      })) as (Subscription & { profile: Profile | null })[];
    },
  });

  // Fetch requests
  const { data: requests, isLoading: loadingRequests } = useQuery({
    queryKey: ['admin-subscription-requests', requestTab],
    queryFn: async () => {
      const query = supabase
        .from('subscription_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (requestTab !== 'all') {
        query.eq('status', requestTab);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data as SubscriptionRequest[];
    },
    enabled: activeTab === 'requests',
  });

  // Add subscriber mutation - OPTIMIZED: Fire-and-forget email
  const addSubscriberMutation = useMutation({
    mutationFn: async () => {
      if (!addEmail.trim()) throw new Error('Please enter email');

      // Find user by email
      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('user_id, email, full_name')
        .eq('email', addEmail.trim().toLowerCase())
        .maybeSingle();

      if (profileError) throw profileError;
      if (!profile) throw new Error('User not found with this email. They must sign up first.');

      const expiresAt = addPlanType === 'monthly'
        ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()  // 30 days
        : null; // lifetime — no expiry

      // Upsert subscription
      const { error: subError } = await supabase
        .from('subscriptions')
        .upsert({
          user_id: profile.user_id as string,
          plan_type: addPlanType,
          status: 'active',
          activated_at: new Date().toISOString(),
          expires_at: expiresAt,
          activated_by: user?.id,
        }, { onConflict: 'user_id' });

      if (subError) throw subError;

      // Fire-and-forget email - don't wait for response
      supabase.functions.invoke('send-subscription-email', {
        body: {
          to: profile.email,
          userName: profile.full_name || profile.email.split('@')[0],
          planType: addPlanType,
          status: 'approved',
          adminNotes: `Your ${addPlanType} subscription has been activated by admin.`,
        },
      }).catch(err => console.error('Email failed:', err));

      return profile;
    },
    onSuccess: (profile) => {
      toast.success(`Subscription activated for ${profile.email}!`);
      setAddEmail('');
      queryClient.invalidateQueries({ queryKey: ['admin-active-subscribers'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Remove subscriber mutation - OPTIMIZED: Fire-and-forget email
  const removeSubscriberMutation = useMutation({
    mutationFn: async ({ userId, email }: { userId: string; email: string }) => {
      const { error } = await supabase
        .from('subscriptions')
        .update({
          status: 'cancelled',
          plan_type: 'none',
          expires_at: new Date().toISOString(),
        })
        .eq('user_id', userId);

      if (error) throw error;

      // Fire-and-forget email - don't wait for response
      supabase.functions.invoke('send-subscription-email', {
        body: {
          to: email,
          userName: email.split('@')[0],
          planType: 'monthly',
          status: 'rejected',
          adminNotes: 'Your subscription has been cancelled by admin.',
        },
      }).catch(err => console.error('Email failed:', err));
    },
    onSuccess: () => {
      toast.success('Subscription removed!');
      setRemoveDialog(null);
      queryClient.invalidateQueries({ queryKey: ['admin-active-subscribers'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  // Process request mutation - OPTIMIZED: Parallel DB ops + Fire-and-forget email
  const processRequestMutation = useMutation({
    mutationFn: async ({ requestId, action }: { requestId: string; action: 'approve' | 'reject' }) => {
      const request = requests?.find(r => r.id === requestId);
      if (!request) throw new Error('Request not found');

      // Run request update first (required)
      const { error: requestError } = await supabase
        .from('subscription_requests')
        .update({
          status: action === 'approve' ? 'approved' : 'rejected',
          reviewed_by: user?.id,
          reviewed_at: new Date().toISOString(),
          admin_notes: adminNotes || null,
        })
        .eq('id', requestId);

      if (requestError) throw requestError;

      // If approving, create subscription
      if (action === 'approve') {
        const expiresAt = request.plan_type === 'monthly'
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
          : null;

        const { error: subError } = await supabase
          .from('subscriptions')
          .upsert({
            user_id: request.user_id,
            plan_type: request.plan_type,
            status: 'active',
            activated_at: new Date().toISOString(),
            expires_at: expiresAt,
            activated_by: user?.id,
          }, { onConflict: 'user_id' });

        if (subError) throw subError;
      }

      // Fire-and-forget email - don't wait for response
      supabase.functions.invoke('send-subscription-email', {
        body: {
          to: request.email,
          userName: request.full_name,
          planType: request.plan_type,
          status: action === 'approve' ? 'approved' : 'rejected',
          adminNotes: adminNotes || undefined,
        },
      }).catch(err => console.error('Email failed:', err));
    },
    onSuccess: (_, { action }) => {
      toast.success(action === 'approve' ? 'Subscription activated!' : 'Request rejected.');
      setSelectedRequest(null);
      setAdminNotes('');
      queryClient.invalidateQueries({ queryKey: ['admin-subscription-requests'] });
      queryClient.invalidateQueries({ queryKey: ['admin-active-subscribers'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const filteredSubscribers = subscribers?.filter(
    (sub) => {
      if (!searchQuery.trim()) return true;
      const search = searchQuery.toLowerCase();
      return (
        sub.profile?.email.toLowerCase().includes(search) ||
        sub.profile?.full_name?.toLowerCase().includes(search)
      );
    }
  );

  const filteredRequests = requests?.filter(
    (req) => {
      if (!searchQuery.trim()) return true;
      const search = searchQuery.toLowerCase();
      return (
        req.email.toLowerCase().includes(search) ||
        req.full_name.toLowerCase().includes(search) ||
        req.phone.includes(search)
      );
    }
  );

  const stats = {
    total: subscribers?.length || 0,
    monthly: subscribers?.filter(s => s.plan_type === 'monthly').length || 0,
    lifetime: subscribers?.filter(s => s.plan_type === 'lifetime').length || 0,
    pending: requests?.filter(r => r.status === 'pending').length || 0,
  };

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const openActionDialog = (request: SubscriptionRequest, action: 'approve' | 'reject') => {
    setSelectedRequest(request);
    setActionType(action);
    setAdminNotes('');
  };

  return (
    <DashboardLayout>
      <div className="space-y-6 px-2 sm:px-4 lg:px-6 pb-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <Link
            to="/admin"
            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
          >
            <ArrowLeft className="h-5 w-5" />
          </Link>
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold">Subscriptions</h1>
            <p className="text-sm text-muted-foreground">
              Manage subscribers and requests
            </p>
          </div>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                  <Users className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total}</p>
                  <p className="text-xs text-muted-foreground">Active</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <Zap className="h-5 w-5 text-blue-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.monthly}</p>
                  <p className="text-xs text-muted-foreground">Monthly</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
                  <Crown className="h-5 w-5 text-amber-500" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.lifetime}</p>
                  <p className="text-xs text-muted-foreground">Lifetime</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card className="glass-card">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-warning/10 flex items-center justify-center">
                  <Clock className="h-5 w-5 text-warning" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.pending}</p>
                  <p className="text-xs text-muted-foreground">Pending</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Main Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="h-10">
            <TabsTrigger value="subscribers" className="gap-1">
              <Users className="h-4 w-4" />
              Subscribers
            </TabsTrigger>
            <TabsTrigger value="requests" className="gap-1">
              <MessageSquare className="h-4 w-4" />
              Requests
              {stats.pending > 0 && (
                <Badge className="ml-1 h-5 w-5 p-0 flex items-center justify-center text-[10px]">
                  {stats.pending}
                </Badge>
              )}
            </TabsTrigger>
          </TabsList>

          {/* Subscribers Tab */}
          <TabsContent value="subscribers" className="mt-4 space-y-4">
            {/* Add Subscriber Card */}
            <Card className="glass-card border-primary/30">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg flex items-center gap-2">
                  <UserPlus className="h-5 w-5 text-primary" />
                  Add Subscriber
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col sm:flex-row gap-3">
                  <div className="flex-1">
                    <Input
                      placeholder="Enter user email..."
                      value={addEmail}
                      onChange={(e) => setAddEmail(e.target.value)}
                      className="h-11 rounded-xl"
                      type="email"
                    />
                  </div>
                  <Select value={addPlanType} onValueChange={(v: 'monthly' | 'lifetime') => setAddPlanType(v)}>
                    <SelectTrigger className="w-full sm:w-44 h-11 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="monthly">
                        <span className="flex items-center gap-2">
                          <Zap className="h-4 w-4 text-blue-500" />
                          Monthly (30 days)
                        </span>
                      </SelectItem>
                      <SelectItem value="lifetime">
                        <span className="flex items-center gap-2">
                          <Crown className="h-4 w-4 text-amber-500" />
                          Lifetime
                        </span>
                      </SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    onClick={() => addSubscriberMutation.mutate()}
                    disabled={addSubscriberMutation.isPending || !addEmail.trim()}
                    className="h-11 rounded-xl"
                  >
                    {addSubscriberMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    ) : (
                      <UserPlus className="h-4 w-4 mr-2" />
                    )}
                    Add Subscriber
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground mt-2">
                  User must have an account. Email notification will be sent automatically.
                </p>
              </CardContent>
            </Card>

            {/* Search */}
            <div className="relative max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search subscribers..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10 h-10 rounded-xl"
              />
            </div>

            {/* Subscribers List */}
            {loadingSubscribers ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredSubscribers && filteredSubscribers.length > 0 ? (
              <div className="space-y-3">
                {filteredSubscribers.map((sub) => (
                  <Card key={sub.id} className="glass-card hover:border-primary/30 transition-all">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant={sub.plan_type === 'lifetime' ? 'default' : 'secondary'}
                              className={sub.plan_type === 'lifetime' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : 'bg-blue-500/20 text-blue-500 border-blue-500/30'}
                            >
                              {sub.plan_type === 'lifetime' ? (
                                <><Crown className="h-3 w-3 mr-1" /> Lifetime</>
                              ) : (
                                <><Zap className="h-3 w-3 mr-1" /> Monthly</>
                              )}
                            </Badge>
                            {sub.plan_type === 'monthly' && sub.expires_at && (
                              <span className="text-xs text-muted-foreground">
                                Expires {formatDistanceToNow(new Date(sub.expires_at), { addSuffix: true })}
                              </span>
                            )}
                          </div>
                          <h3 className="font-semibold flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {sub.profile?.full_name || 'Unknown'}
                          </h3>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {sub.profile?.email || 'No email'}
                            </span>
                            {sub.activated_at && (
                              <span className="flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                Since {format(new Date(sub.activated_at), 'MMM d, yyyy')}
                              </span>
                            )}
                          </div>
                        </div>

                        <Button
                          variant="outline"
                          size="sm"
                          className="text-destructive border-destructive/30 hover:bg-destructive/10"
                          onClick={() => setRemoveDialog({ userId: sub.user_id, email: sub.profile?.email || '' })}
                        >
                          <Trash2 className="h-4 w-4 mr-1" />
                          Remove
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="glass-card p-12 text-center">
                <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No active subscribers found</p>
              </Card>
            )}
          </TabsContent>

          {/* Requests Tab */}
          <TabsContent value="requests" className="mt-4 space-y-4">
            {/* Sub Tabs */}
            <div className="flex flex-col sm:flex-row gap-4">
              <Tabs value={requestTab} onValueChange={setRequestTab} className="flex-1">
                <TabsList className="h-10">
                  <TabsTrigger value="pending" className="gap-1">
                    <Clock className="h-3 w-3" />
                    Pending
                  </TabsTrigger>
                  <TabsTrigger value="approved" className="gap-1">
                    <CheckCircle2 className="h-3 w-3" />
                    Approved
                  </TabsTrigger>
                  <TabsTrigger value="rejected" className="gap-1">
                    <XCircle className="h-3 w-3" />
                    Rejected
                  </TabsTrigger>
                </TabsList>
              </Tabs>
              <div className="relative max-w-xs">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10 h-10 rounded-xl"
                />
              </div>
            </div>

            {/* Requests List */}
            {loadingRequests ? (
              <div className="flex items-center justify-center p-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredRequests && filteredRequests.length > 0 ? (
              <div className="space-y-3">
                {filteredRequests.map((request) => (
                  <Card key={request.id} className="glass-card hover:border-primary/30 transition-all">
                    <CardContent className="p-4 sm:p-5">
                      <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-2">
                            <Badge
                              variant={request.plan_type === 'lifetime' ? 'default' : 'secondary'}
                              className={request.plan_type === 'lifetime' ? 'bg-amber-500/20 text-amber-500 border-amber-500/30' : ''}
                            >
                              {request.plan_type === 'lifetime' ? (
                                <><Crown className="h-3 w-3 mr-1" /> Lifetime</>
                              ) : (
                                <><Zap className="h-3 w-3 mr-1" /> Monthly</>
                              )}
                            </Badge>
                            <Badge
                              variant="outline"
                              className={
                                request.status === 'pending' ? 'border-warning text-warning' :
                                  request.status === 'approved' ? 'border-success text-success' :
                                    'border-destructive text-destructive'
                              }
                            >
                              {request.status}
                            </Badge>
                          </div>
                          <h3 className="font-semibold flex items-center gap-2">
                            <User className="h-4 w-4 text-muted-foreground" />
                            {request.full_name}
                          </h3>
                          <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Mail className="h-3 w-3" />
                              {request.email}
                            </span>
                            <span className="flex items-center gap-1">
                              <Phone className="h-3 w-3" />
                              {request.phone}
                            </span>
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(request.created_at), 'MMM d, yyyy h:mm a')}
                            </span>
                          </div>
                          {request.message && (
                            <p className="mt-2 text-sm text-muted-foreground flex items-start gap-2">
                              <MessageSquare className="h-4 w-4 mt-0.5 flex-shrink-0" />
                              {request.message}
                            </p>
                          )}
                        </div>

                        {request.status === 'pending' && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="text-destructive border-destructive/30 hover:bg-destructive/10"
                              onClick={() => openActionDialog(request, 'reject')}
                            >
                              <XCircle className="h-4 w-4 mr-1" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="bg-success hover:bg-success/90"
                              onClick={() => openActionDialog(request, 'approve')}
                            >
                              <CheckCircle2 className="h-4 w-4 mr-1" />
                              Approve
                            </Button>
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <Card className="glass-card p-12 text-center">
                <CreditCard className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
                <p className="text-muted-foreground">No {requestTab} requests found</p>
              </Card>
            )}
          </TabsContent>
        </Tabs>

        {/* Request Action Dialog */}
        <Dialog open={!!selectedRequest} onOpenChange={(open) => !open && setSelectedRequest(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                {actionType === 'approve' ? (
                  <><CheckCircle2 className="h-5 w-5 text-success" /> Approve Request</>
                ) : (
                  <><XCircle className="h-5 w-5 text-destructive" /> Reject Request</>
                )}
              </DialogTitle>
            </DialogHeader>
            {selectedRequest && (
              <div className="space-y-4 py-4">
                <div className="p-4 rounded-xl bg-muted/50">
                  <p className="font-medium">{selectedRequest.full_name}</p>
                  <p className="text-sm text-muted-foreground">{selectedRequest.email}</p>
                  <Badge className="mt-2">
                    {selectedRequest.plan_type === 'lifetime' ? '$99 Lifetime' : '$10/month'}
                  </Badge>
                </div>
                <div className="space-y-2">
                  <Label>Admin Notes (Optional)</Label>
                  <Textarea
                    placeholder="Add notes about this decision..."
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    className="min-h-[80px] rounded-xl resize-none"
                  />
                </div>
              </div>
            )}
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setSelectedRequest(null)}>
                Cancel
              </Button>
              <Button
                onClick={() => selectedRequest && processRequestMutation.mutate({
                  requestId: selectedRequest.id,
                  action: actionType
                })}
                disabled={processRequestMutation.isPending}
                className={actionType === 'approve' ? 'bg-success hover:bg-success/90' : 'bg-destructive hover:bg-destructive/90'}
              >
                {processRequestMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                {actionType === 'approve' ? 'Activate Subscription' : 'Reject Request'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Remove Confirmation Dialog */}
        <Dialog open={!!removeDialog} onOpenChange={(open) => !open && setRemoveDialog(null)}>
          <DialogContent className="max-w-sm">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-destructive">
                <AlertCircle className="h-5 w-5" />
                Remove Subscription
              </DialogTitle>
              <DialogDescription>
                Are you sure you want to remove subscription for <strong>{removeDialog?.email}</strong>?
                They will lose access to premium features and receive an email notification.
              </DialogDescription>
            </DialogHeader>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 pt-4">
              <Button variant="outline" onClick={() => setRemoveDialog(null)}>
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={() => removeDialog && removeSubscriberMutation.mutate(removeDialog)}
                disabled={removeSubscriberMutation.isPending}
              >
                {removeSubscriberMutation.isPending && <Loader2 className="h-4 w-4 animate-spin mr-2" />}
                Remove
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  );
}
