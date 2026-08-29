import { useState } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Key, Clock, Link as LinkIcon, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { useNavigate } from "@/lib/router-compat";
import { useServerFn } from "@tanstack/react-start";
import { saveProviderAccount, testProviderAccount } from "@/lib/providers.functions";

interface ProviderAccount {
  id: string;
  provider_id: string;
  name: string;
  api_key: string;
  api_url: string;
  priority: number;
  is_active: boolean;
  last_used_at: string | null;
  created_at: string;
  updated_at: string;
  delivery_multiplier?: number | null;
}

interface Provider {
  id: string;
  name: string;
  api_url: string;
}

export default function AdminProviderAccounts() {
  const navigate = useNavigate();
  const saveAccountFn = useServerFn(saveProviderAccount);
  const testAccountFn = useServerFn(testProviderAccount);
  const [testResult, setTestResult] = useState<string | null>(null);
  const [isTesting, setIsTesting] = useState(false);
  const queryClient = useQueryClient();
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingAccount, setEditingAccount] = useState<ProviderAccount | null>(null);
  
  // Form state
  const [formData, setFormData] = useState({
    provider_id: "",
    name: "",
    api_key: "",
    api_url: "",
    priority: 1,
    is_active: true,
    delivery_multiplier: 1,
  });

  // Fetch providers for dropdown
  const { data: providers } = useQuery({
    queryKey: ["providers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("providers")
        .select("id, name, api_url")
        .eq("is_active", true);
      if (error) throw error;
      return data as Provider[];
    },
  });

  // Fetch provider accounts
  const { data: accounts, isLoading } = useQuery({
    queryKey: ["provider-accounts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("provider_accounts")
        .select("*")
        .order("provider_id", { ascending: true })
        .order("priority", { ascending: true });
      if (error) throw error;
      return data as ProviderAccount[];
    },
  });

  // Create/Update mutation
  const saveMutation = useMutation({
    mutationFn: async (data: typeof formData & { id?: string }) => {
      // Server function verifies the provider credentials, registers the
      // provider row (services.provider_id FK) and saves the account.
      return await saveAccountFn({
        data: {
          ...(data.id ? { id: data.id } : {}),
          provider_id: data.provider_id.trim(),
          name: data.name.trim(),
          api_key: data.api_key.trim(),
          api_url: data.api_url.trim(),
          priority: Number(data.priority) || 1,
          is_active: data.is_active,
          delivery_multiplier: Number(data.delivery_multiplier) || 1,
        },
      });
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ["provider-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      toast.success(
        `${editingAccount ? "Account updated" : "Account connected"} — balance ${result.balance} ${result.currency}`,
      );
      setIsDialogOpen(false);
      resetForm();
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to save account");
    },
  });

  const handleTestConnection = async () => {
    setIsTesting(true);
    setTestResult(null);
    try {
      const res = await testAccountFn({
        data: { api_url: formData.api_url.trim(), api_key: formData.api_key.trim() },
      });
      setTestResult(`Connected — balance ${res.balance} ${res.currency}`);
      toast.success("Provider connection successful");
    } catch (err: any) {
      setTestResult(err?.message || "Connection failed");
      toast.error(err?.message || "Connection failed");
    } finally {
      setIsTesting(false);
    }
  };

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const account = accounts?.find(a => a.id === id);
      if (!account) throw new Error("Account not found");

      // Nullify references in organic_run_schedule
      const { error: refError } = await supabase
        .from("organic_run_schedule")
        .update({ provider_account_id: null })
        .eq("provider_account_id", id);
      if (refError) throw refError;

      // Delete service_provider_mapping for this account
      const { error: mapError } = await supabase
        .from("service_provider_mapping")
        .delete()
        .eq("provider_account_id", id);
      if (mapError) throw mapError;

      // Delete the provider account
      const { error } = await supabase
        .from("provider_accounts")
        .delete()
        .eq("id", id);
      if (error) throw error;

      // Check if any other accounts remain for this provider_id
      const { data: remainingAccounts } = await supabase
        .from("provider_accounts")
        .select("id")
        .eq("provider_id", account.provider_id)
        .limit(1);

      // If no accounts left, clean up all services of this provider
      if (!remainingAccounts?.length) {
        const { data: services } = await supabase
          .from("services")
          .select("id")
          .eq("provider_id", account.provider_id);

        if (services?.length) {
          const serviceIds = services.map(s => s.id);
          // Batch nullify all FK references
          await Promise.all([
            ...serviceIds.map(sid => supabase.from("bundle_items").update({ service_id: null }).eq("service_id", sid)),
            ...serviceIds.map(sid => supabase.from("engagement_order_items").update({ service_id: null }).eq("service_id", sid)),
            ...serviceIds.map(sid => supabase.from("service_provider_mapping").delete().eq("service_id", sid)),
          ]);
          // Delete all services
          await supabase.from("services").delete().eq("provider_id", account.provider_id);
        }
        // Delete the provider itself
        await supabase.from("providers").delete().eq("id", account.provider_id);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-accounts"] });
      queryClient.invalidateQueries({ queryKey: ["providers"] });
      toast.success("Account and all associated services have been removed!");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to delete account");
    },
  });

  // Toggle active status
  const toggleMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from("provider_accounts")
        .update({ is_active })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["provider-accounts"] });
    },
  });

  const resetForm = () => {
    setFormData({
      provider_id: "",
      name: "",
      api_key: "",
      api_url: "",
      priority: 1,
      is_active: true,
      delivery_multiplier: 1,
    });
    setTestResult(null);
    setEditingAccount(null);
  };

  const openEditDialog = (account: ProviderAccount) => {
    setEditingAccount(account);
    setFormData({
      provider_id: account.provider_id,
      name: account.name,
      api_key: account.api_key,
      api_url: account.api_url,
      priority: account.priority,
      is_active: account.is_active,
      delivery_multiplier: Number(account.delivery_multiplier ?? 1),
    });
    setIsDialogOpen(true);
  };

  const handleProviderChange = (providerId: string) => {
    const provider = providers?.find(p => p.id === providerId);
    setFormData(prev => ({
      ...prev,
      provider_id: providerId,
      api_url: provider?.api_url || prev.api_url,
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    saveMutation.mutate({ ...formData, id: editingAccount?.id });
  };

  const maskApiKey = (key: string) => {
    if (key.length <= 8) return "***";
    return `${key.slice(0, 4)}...${key.slice(-4)}`;
  };

  // Group accounts by provider
  const groupedAccounts = accounts?.reduce((acc, account) => {
    if (!acc[account.provider_id]) {
      acc[account.provider_id] = [];
    }
    acc[account.provider_id].push(account);
    return acc;
  }, {} as Record<string, ProviderAccount[]>);

  return (
    <DashboardLayout>
      <div className="space-y-6 p-4 md:p-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/admin")}
              className="shrink-0"
            >
              <ArrowLeft className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-2xl font-bold">Provider Accounts</h1>
              <p className="text-sm text-muted-foreground">
                Manage multiple API keys for round-robin provider rotation
              </p>
            </div>
          </div>
          
          <Dialog open={isDialogOpen} onOpenChange={(open) => {
            setIsDialogOpen(open);
            if (!open) resetForm();
          }}>
            <DialogTrigger asChild>
              <Button className="gap-2">
                <Plus className="h-4 w-4" />
                Add Account
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-md">
              <form onSubmit={handleSubmit}>
                <DialogHeader>
                  <DialogTitle>{editingAccount ? "Edit" : "Add"} Provider Account</DialogTitle>
                  <DialogDescription>
                    Add multiple API keys for the same provider to enable round-robin delivery
                  </DialogDescription>
                </DialogHeader>
                
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label>Base Provider (ID)</Label>
                    <Input
                      placeholder="e.g., yoyo, dreepfed, justanother"
                      value={formData.provider_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, provider_id: e.target.value }))}
                      required
                    />
                    <p className="text-xs text-muted-foreground">Koi bhi custom provider ID likh sakte ho</p>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Account Name</Label>
                    <Input
                      placeholder="e.g., YOYO Account 2"
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>API Key</Label>
                    <Input
                      type="password"
                      placeholder="Enter API key"
                      value={formData.api_key}
                      onChange={(e) => setFormData(prev => ({ ...prev, api_key: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>API URL</Label>
                    <Input
                      placeholder="https://api.provider.com"
                      value={formData.api_url}
                      onChange={(e) => setFormData(prev => ({ ...prev, api_url: e.target.value }))}
                      required
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Priority (lower = used first)</Label>
                    <Input
                      type="number"
                      min={1}
                      max={100}
                      value={formData.priority}
                      onChange={(e) => setFormData(prev => ({ ...prev, priority: parseInt(e.target.value) || 1 }))}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>Delivery Multiplier (over-delivery factor)</Label>
                    <Input
                      type="number"
                      step="0.1"
                      min={0.5}
                      max={5}
                      value={formData.delivery_multiplier}
                      onChange={(e) => setFormData(prev => ({ ...prev, delivery_multiplier: parseFloat(e.target.value) || 1 }))}
                    />
                    <p className="text-xs text-muted-foreground">
                      Agar yeh provider 2x extra deta hai (1000 order par 2000 deta hai), to <strong>2.0</strong> set karo. System apne aap aadhi quantity bhejega. Default: <strong>1.0</strong>
                    </p>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <Switch
                      id="is_active"
                      checked={formData.is_active}
                      onCheckedChange={(checked) => setFormData(prev => ({ ...prev, is_active: checked }))}
                    />
                    <Label htmlFor="is_active">Active</Label>
                  </div>
                </div>
                
                {testResult && (
                  <p className="text-xs text-muted-foreground pb-2">{testResult}</p>
                )}

                <DialogFooter>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isTesting || !formData.api_url || !formData.api_key}
                    onClick={handleTestConnection}
                  >
                    {isTesting ? "Testing..." : "Test connection"}
                  </Button>
                  <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={saveMutation.isPending}>
                    {saveMutation.isPending ? "Saving..." : "Save"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>

        {/* Info Card */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-sm text-primary-foreground/80">
              <strong>Round-Robin System:</strong> Add multiple accounts for the same provider. 
              When sending orders, the system will automatically rotate between accounts 
              using LRU (Least Recently Used) selection to prevent "active order on this link" errors.
            </p>
          </CardContent>
        </Card>

        {/* Accounts List */}
        {isLoading ? (
          <div className="text-center py-10 text-muted-foreground">Loading...</div>
        ) : !accounts?.length ? (
          <Card>
            <CardContent className="py-10 text-center text-muted-foreground">
              No provider accounts yet. Click "Add Account" to create one.
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-6">
            {Object.entries(groupedAccounts || {}).map(([providerId, providerAccounts]) => (
              <Card key={providerId}>
                <CardHeader className="pb-3">
                  <CardTitle className="text-lg flex items-center gap-2">
                    {providers?.find(p => p.id === providerId)?.name || providerId}
                    <Badge variant="secondary">{providerAccounts.length} accounts</Badge>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>API Key</TableHead>
                        <TableHead>Priority</TableHead>
                        <TableHead>Last Used</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {providerAccounts.map((account) => (
                        <TableRow key={account.id}>
                          <TableCell className="font-medium">{account.name}</TableCell>
                          <TableCell>
                            <code className="text-xs bg-muted px-2 py-1 rounded">
                              {maskApiKey(account.api_key)}
                            </code>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline">#{account.priority}</Badge>
                          </TableCell>
                          <TableCell>
                            {account.last_used_at ? (
                              <span className="text-sm text-muted-foreground flex items-center gap-1">
                                <Clock className="h-3 w-3" />
                                {formatDistanceToNow(new Date(account.last_used_at), { addSuffix: true })}
                              </span>
                            ) : (
                              <span className="text-sm text-muted-foreground">Never</span>
                            )}
                          </TableCell>
                          <TableCell>
                            <Switch
                              checked={account.is_active}
                              onCheckedChange={(checked) => 
                                toggleMutation.mutate({ id: account.id, is_active: checked })
                              }
                            />
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => openEditDialog(account)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="text-destructive hover:text-destructive"
                                onClick={() => {
                                  if (confirm("Delete this account?")) {
                                    deleteMutation.mutate(account.id);
                                  }
                                }}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {/* Service Mapping Link */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Service Provider Mapping</CardTitle>
            <CardDescription>
              Link services to multiple provider accounts for automatic rotation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => navigate("/admin/service-provider-mapping")}
            >
              <LinkIcon className="h-4 w-4" />
              Configure Service Mappings
            </Button>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
