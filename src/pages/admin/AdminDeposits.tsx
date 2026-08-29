import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table";
import {
    ArrowLeft,
    CheckCircle2,
    XCircle,
    Loader2,
    Search,
    ExternalLink,
    MessageSquare,
    Clock,
    User,
    IndianRupee,
} from 'lucide-react';
import { Link, Navigate } from "@/lib/router-compat";
import { toast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { Input } from '@/components/ui/input';
import { ZapUpiWebhookHealthCard } from '@/components/admin/ZapUpiWebhookHealthCard';

export default function AdminDeposits() {
    const { session, isAdmin, isLoading: authLoading } = useAuth();
    const queryClient = useQueryClient();
    const [searchQuery, setSearchQuery] = useState('');

    const { data: deposits, isLoading } = useQuery({
        queryKey: ['admin-pending-deposits'],
        queryFn: async () => {
            console.log('Fetching admin pending deposits...');

            // Step 1: Fetch transactions (no FK join - avoids RLS issues)
            const { data: txData, error: txError } = await supabase
                .from('transactions')
                .select('*')
                .in('payment_method', ['razorpay_manual', 'usdt_bep20'])
                .order('created_at', { ascending: false });

            if (txError) {
                console.error('Admin Deposits fetch error:', txError);
                toast({
                    title: 'Database Error',
                    description: 'Could not fetch deposits. Check your RLS permissions.',
                    variant: 'destructive',
                });
                throw txError;
            }

            if (!txData || txData.length === 0) return [];

            // Step 2: Fetch profiles for all unique user_ids
            const userIds = [...new Set(txData.map(t => t.user_id))];
            const { data: profilesData } = await (supabase as any)
                .from('profiles')
                .select('user_id, email, full_name, avatar_url')
                .in('user_id', userIds);

            // Step 3: Merge profiles into transactions
            const profileMap = new Map(
                (profilesData || []).map(p => [p.user_id, p])
            );

            const merged = txData.map(tx => ({
                ...tx,
                profiles: profileMap.get(tx.user_id) || { email: 'Unknown', full_name: 'Unknown' },
            }));

            console.log('Admin Deposits fetched successfully:', merged.length, 'records');
            return merged;
        },
    });

    const callPendingDepositAction = useServerFn(adminPendingDepositAction);
    const updateStatusMutation = useMutation({
        mutationFn: async ({ id, status, userId, amount }: { id: string, status: 'completed' | 'failed', userId: string, amount: number }) => {
            // Approvals/rejections go through the authenticated server function,
            // which enforces admin role server-side. Direct wallet/transaction
            // writes are blocked by RLS.
            await callPendingDepositAction({
                data: {
                    transaction_id: id,
                    decision: status === 'completed' ? 'approve' : 'reject',
                },
            });
        },
        onSuccess: async (_, variables) => {
            const statusText = variables.status === 'completed' ? '✅ APPROVED' : '❌ REJECTED';
            const deposit = deposits?.find(d => d.id === variables.id);

            toast({
                title: `Deposit ${variables.status === 'completed' ? 'Approved' : 'Rejected'}`,
                description: 'The operation was processed successfully.',
            });

            // Log to Telegram (with user photo if available)
            try {
                const profile = deposit?.profiles as any;
                const tgMessage = `<b>${statusText}: Deposit Request</b>\n\n` +
                    `👤 <b>User:</b> ${profile?.full_name || 'Unknown'}\n` +
                    `📧 <b>Email:</b> ${profile?.email}\n` +
                    `💰 <b>Amount:</b> $${variables.amount}\n` +
                    `🆔 <b>ID:</b> <code>${deposit?.payment_reference}</code>\n` +
                    `📅 <b>Action Date:</b> ${new Date().toLocaleString()}`;

                await supabase.functions.invoke('send-telegram-notification', {
                    body: {
                        message: tgMessage,
                        // Send profile photo URL if user has one
                        ...(profile?.avatar_url ? { photo_url: profile.avatar_url } : {}),
                    },
                });
            } catch (e) {
                console.error('TG log failed:', e);
            }

            queryClient.invalidateQueries({ queryKey: ['admin-pending-deposits'] });
            queryClient.invalidateQueries({ queryKey: ['admin-all-users-with-subs'] });
        },
        onError: (error: Error) => {
            toast({
                title: 'Operation Failed',
                description: error.message,
                variant: 'destructive',
            });
        },
    });

    if (authLoading) {
        return (
            <DashboardLayout>
                <div className="flex items-center justify-center min-h-[60vh]">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
            </DashboardLayout>
        );
    }

    if (!isAdmin) {
        return <Navigate to="/dashboard" replace />;
    }

    const filteredDeposits = deposits?.filter(d => {
        if (!searchQuery.trim()) return true;
        const search = searchQuery.toLowerCase();
        const refMatch = d.payment_reference?.toLowerCase().includes(search) || false;
        const emailMatch = (d.profiles as any)?.email?.toLowerCase().includes(search) || false;
        const nameMatch = (d.profiles as any)?.full_name?.toLowerCase().includes(search) || false;
        const descMatch = d.description?.toLowerCase().includes(search) || false;
        return refMatch || emailMatch || nameMatch || descMatch;
    });

    return (
        <DashboardLayout>
            <div className="space-y-6 px-2 sm:px-4 lg:px-6 pb-8">
                {/* Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                        <Link
                            to="/admin"
                            className="w-10 h-10 rounded-xl bg-muted flex items-center justify-center hover:bg-muted/80 transition-colors"
                        >
                            <ArrowLeft className="h-5 w-5" />
                        </Link>
                        <div>
                            <h1 className="text-2xl sm:text-3xl font-bold text-foreground">
                                Deposit Requests
                            </h1>
                            <p className="text-sm text-muted-foreground flex items-center gap-2">
                                <Clock className="h-4 w-4" />
                                Legacy manual deposits — Approve is permanently disabled. Only ZapUPI auto-credits funds.
                            </p>
                        </div>
                    </div>
                    <div className="relative w-full sm:w-64">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <Input
                            placeholder="Search Payment ID or Email..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="pl-10 h-11 rounded-xl glass-card"
                        />
                    </div>
                </div>

                {/* Webhook Health Check */}
                <ZapUpiWebhookHealthCard />

                {/* Table Card */}
                <Card className="glass-card overflow-hidden">
                    <Table>
                        <TableHeader className="bg-muted/50">
                            <TableRow className="hover:bg-transparent">
                                <TableHead>User</TableHead>
                                <TableHead>Amount</TableHead>
                                <TableHead>Payment ID</TableHead>
                                <TableHead>Details</TableHead>
                                <TableHead>Requested</TableHead>
                                <TableHead>Status</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {isLoading ? (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center">
                                        <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                                    </TableCell>
                                </TableRow>
                            ) : filteredDeposits && filteredDeposits.length > 0 ? (
                                filteredDeposits.map((tx) => (
                                    <TableRow key={tx.id} className="hover:bg-muted/30 transition-colors group">
                                        <TableCell>
                                            <div className="flex items-center gap-2.5">
                                                {/* Avatar */}
                                                {(tx.profiles as any)?.avatar_url ? (
                                                    <img
                                                        src={(tx.profiles as any).avatar_url}
                                                        alt={(tx.profiles as any)?.full_name || 'User'}
                                                        className="w-9 h-9 rounded-full object-cover shrink-0 border-2 border-primary/20"
                                                    />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-primary/20 flex items-center justify-center shrink-0 border-2 border-primary/20">
                                                        <span className="text-xs font-bold text-primary">
                                                            {((tx.profiles as any)?.full_name || (tx.profiles as any)?.email || 'U').charAt(0).toUpperCase()}
                                                        </span>
                                                    </div>
                                                )}
                                                <div className="flex flex-col min-w-0">
                                                    <span className="font-bold text-sm truncate">{(tx.profiles as any)?.full_name || 'Unnamed'}</span>
                                                    <span className="text-[10px] text-muted-foreground truncate">
                                                        {(tx.profiles as any)?.email}
                                                    </span>
                                                </div>
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <div className="flex flex-col gap-1">
                                                <Badge variant="outline" className="w-fit font-black text-primary border-primary/20 bg-primary/5">
                                                    ₹{(tx.amount * 90).toFixed(2)}
                                                </Badge>
                                                {(() => {
                                                    try {
                                                        const parsed = JSON.parse(tx.description || '{}');
                                                        return <span className="text-[10px] text-muted-foreground italic truncate max-w-[120px]">{parsed.text?.split('|')[0] || tx.description?.split('|')[0]}</span>;
                                                    } catch {
                                                        return <span className="text-[10px] text-muted-foreground italic truncate max-w-[120px]">{tx.description?.split('|')[0]}</span>;
                                                    }
                                                })()}
                                            </div>
                                        </TableCell>
                                        <TableCell>
                                            <code className="text-[11px] font-mono bg-muted px-1.5 py-0.5 rounded border border-border">
                                                {tx.payment_reference}
                                            </code>
                                        </TableCell>
                                        <TableCell>
                                            {(() => {
                                                let descText = tx.description || '';
                                                let screenshotUrl: string | null = null;
                                                try {
                                                    const parsed = JSON.parse(descText);
                                                    descText = parsed.text || descText;
                                                    screenshotUrl = parsed.screenshot_url || null;
                                                } catch { /* plain text */ }
                                                return (
                                                    <div className="flex items-start gap-2 max-w-xs">
                                                        {screenshotUrl ? (
                                                            <a href={screenshotUrl} target="_blank" rel="noopener noreferrer" title="View Payment Screenshot">
                                                                <img
                                                                    src={screenshotUrl}
                                                                    alt="Payment proof"
                                                                    className="w-12 h-12 rounded-lg object-cover border-2 border-primary/30 hover:border-primary transition-colors shrink-0 cursor-pointer shadow-md"
                                                                />
                                                            </a>
                                                        ) : (
                                                            <MessageSquare className="h-3.5 w-3.5 text-primary/60 mt-0.5 shrink-0" />
                                                        )}
                                                        <span className="text-xs font-medium text-foreground line-clamp-2">{descText}</span>
                                                    </div>
                                                );
                                            })()}
                                        </TableCell>
                                        <TableCell>
                                            <span className="text-[11px] text-muted-foreground whitespace-nowrap">
                                                {format(new Date(tx.created_at!), 'MMM d, h:mm a')}
                                            </span>
                                        </TableCell>
                                        <TableCell>
                                            {tx.status === 'pending' ? (
                                                <Badge className="bg-amber-500/10 text-amber-500 border-amber-500/20 text-[10px] uppercase tracking-wider">
                                                    Pending
                                                </Badge>
                                            ) : tx.status === 'completed' ? (
                                                <Badge className="bg-success/10 text-success border-success/20 text-[10px] uppercase tracking-wider">
                                                    Approved
                                                </Badge>
                                            ) : (
                                                <Badge className="bg-destructive/10 text-destructive border-destructive/20 text-[10px] uppercase tracking-wider">
                                                    Rejected
                                                </Badge>
                                            )}
                                        </TableCell>
                                        <TableCell className="text-right">
                                            {tx.status === 'pending' && (
                                                <div className="flex items-center justify-end gap-2">
                                                    <Button
                                                        size="sm"
                                                        variant="destructive"
                                                        className="h-8 px-3 text-[11px] font-bold gap-1.5 hover:scale-105 transition-all"
                                                        onClick={() => updateStatusMutation.mutate({ id: tx.id, status: 'failed', userId: tx.user_id, amount: Number(tx.amount) })}
                                                        disabled={updateStatusMutation.isPending}
                                                    >
                                                        <XCircle className="h-3.5 w-3.5" />
                                                        Reject
                                                    </Button>
                                                </div>
                                            )}
                                            {tx.status === 'completed' && (
                                                <div className="text-[10px] text-success font-bold flex items-center justify-end gap-1">
                                                    <CheckCircle2 className="h-3 w-3" />
                                                    Finalized
                                                </div>
                                            )}
                                            {tx.status === 'failed' && (
                                                <div className="text-[10px] text-destructive font-bold flex items-center justify-end gap-1">
                                                    <XCircle className="h-3 w-3" />
                                                    Cancelled
                                                </div>
                                            )}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={7} className="h-32 text-center text-muted-foreground">
                                        No deposit requests found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </Card>
            </div>
        </DashboardLayout>
    );
}
