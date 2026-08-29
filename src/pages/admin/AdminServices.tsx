import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { DashboardLayout } from '@/components/layout/DashboardLayout';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Package,
  Plus,
  Edit2,
  Trash2,
  Search,
  Loader2,
  ArrowLeft,
  Download,
  RefreshCw,
} from 'lucide-react';
import { Link, Navigate } from "@/lib/router-compat";
import { toast } from 'sonner';
import type { Service } from '@/lib/supabase';
import { ImportServicesDialog } from '@/components/admin/ImportServicesDialog';
import { useServerFn } from '@tanstack/react-start';
import { syncProviderPrices, lookupProviderService } from '@/lib/providers.functions';

function validateServiceForm(f: {
  provider_id: string;
  provider_service_id: string;
  name: string;
  category: string;
  price: string;
  min_quantity: string;
  max_quantity: string;
}): string | null {
  if (!f.name.trim()) return 'Service name is required';
  if (!f.category) return 'Please select a category';
  if (f.provider_service_id && !/^[0-9]{1,12}$/.test(f.provider_service_id.trim()))
    return 'Provider Service ID must be a number (e.g. 1001) with no spaces or letters';
  if (f.provider_service_id && !f.provider_id)
    return 'Select a provider — without it prices cannot be synced for this service';
  const price = parseFloat(f.price);
  if (!Number.isFinite(price) || price <= 0) return 'Price per 1K must be a number greater than 0';
  const min = parseInt(f.min_quantity, 10);
  const max = parseInt(f.max_quantity, 10);
  if (!Number.isFinite(min) || min < 1) return 'Min quantity must be at least 1';
  if (!Number.isFinite(max) || max < 1) return 'Max quantity must be at least 1';
  if (min > max) return 'Min quantity cannot be greater than Max quantity';
  return null;
}

export default function AdminServices() {
  const syncPricesFn = useServerFn(syncProviderPrices);
  const { isAdmin, isLoading: authLoading } = useAuth();
  const queryClient = useQueryClient();
  const [searchQuery, setSearchQuery] = useState('');
  const [showAddService, setShowAddService] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [isSyncingPrices, setIsSyncingPrices] = useState(false);
  const [formData, setFormData] = useState({
    provider_id: '',
    provider_service_id: '',
    name: '',
    category: '',
    description: '',
    price: '',
    min_quantity: '100',
    max_quantity: '100000',
    speed: 'medium',
    quality: 'standard',
    drip_feed_enabled: true,
    is_active: true,
  });

  const runSyncPrices = async () => {
    setIsSyncingPrices(true);
    try {
      const data = await syncPricesFn({});
      toast.success(`${data.updated} service price(s) synced from providers`);
      for (const e of data.errors ?? []) {
        toast.error(`Price sync failed — ${e}`, { duration: 10000 });
      }
      queryClient.invalidateQueries({ queryKey: ['admin-all-services'] });
      queryClient.invalidateQueries({ queryKey: ['services'] });
    } catch (err: any) {
      toast.error(err?.message || 'Price sync failed', {
        duration: 12000,
        action: { label: 'Retry', onClick: () => runSyncPrices() },
      });
    } finally {
      setIsSyncingPrices(false);
    }
  };

  const { data: services, isLoading } = useQuery({
    queryKey: ['admin-all-services'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('category', { ascending: true });

      if (error) throw error;
      return data as Service[];
    },
  });

  const addServiceMutation = useMutation({
    mutationFn: async () => {
      const invalid = validateServiceForm(formData);
      if (invalid) throw new Error(invalid);
      const { error } = await supabase
        .from('services')
        .insert({
          provider_id: formData.provider_id || null,
          provider_service_id: formData.provider_service_id,
          name: formData.name,
          category: formData.category,
          description: formData.description || null,
          price: parseFloat(formData.price),
          min_quantity: parseInt(formData.min_quantity),
          max_quantity: parseInt(formData.max_quantity),
          speed: formData.speed,
          quality: formData.quality,
          drip_feed_enabled: formData.drip_feed_enabled,
          is_active: formData.is_active,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Service added successfully!');
      setShowAddService(false);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['admin-all-services'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const updateServiceMutation = useMutation({
    mutationFn: async () => {
      if (!editingService) return;
      const invalid = validateServiceForm(formData);
      if (invalid) throw new Error(invalid);

      const { error } = await supabase
        .from('services')
        .update({
          provider_id: formData.provider_id || null,
          provider_service_id: formData.provider_service_id,
          name: formData.name,
          category: formData.category,
          description: formData.description || null,
          price: parseFloat(formData.price),
          min_quantity: parseInt(formData.min_quantity),
          max_quantity: parseInt(formData.max_quantity),
          speed: formData.speed,
          quality: formData.quality,
          drip_feed_enabled: formData.drip_feed_enabled,
          is_active: formData.is_active,
        })
        .eq('id', editingService.id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Service updated successfully!');
      setEditingService(null);
      resetForm();
      queryClient.invalidateQueries({ queryKey: ['admin-all-services'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const deleteServiceMutation = useMutation({
    mutationFn: async (id: string) => {
      // Detach from any places that reference this service (FK constraints)
      const { error: bundleError } = await supabase
        .from('bundle_items')
        .update({ service_id: null })
        .eq('service_id', id);
      if (bundleError) throw bundleError;

      const { error: engagementItemsError } = await supabase
        .from('engagement_order_items')
        .update({ service_id: null })
        .eq('service_id', id);
      if (engagementItemsError) throw engagementItemsError;

      const { error: ordersError } = await supabase
        .from('orders')
        .update({ service_id: null })
        .eq('service_id', id);
      if (ordersError) throw ordersError;

      // Delete provider mappings for this service
      const { error: mappingsError } = await supabase
        .from('service_provider_mapping')
        .delete()
        .eq('service_id', id);
      if (mappingsError) throw mappingsError;

      // Finally delete the service
      const { error } = await supabase
        .from('services')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast.success('Service deleted successfully!');
      queryClient.invalidateQueries({ queryKey: ['admin-all-services'] });
      queryClient.invalidateQueries({ queryKey: ['admin-services-active'] });
      queryClient.invalidateQueries({ queryKey: ['admin-bundles'] });
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleServiceMutation = useMutation({
    mutationFn: async ({ id, is_active }: { id: string; is_active: boolean }) => {
      const { error } = await supabase
        .from('services')
        .update({ is_active: !is_active })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-all-services'] });
    },
  });

  const resetForm = () => {
    setFormData({
      provider_id: '',
      provider_service_id: '',
      name: '',
      category: '',
      description: '',
      price: '',
      min_quantity: '100',
      max_quantity: '100000',
      speed: 'medium',
      quality: 'standard',
      drip_feed_enabled: true,
      is_active: true,
    });
  };

  const openEditDialog = (service: Service) => {
    setFormData({
      provider_id: service.provider_id || '',
      provider_service_id: service.provider_service_id,
      name: service.name,
      category: service.category,
      description: service.description || '',
      price: service.price.toString(),
      min_quantity: service.min_quantity.toString(),
      max_quantity: service.max_quantity.toString(),
      speed: service.speed || 'medium',
      quality: service.quality || 'standard',
      drip_feed_enabled: service.drip_feed_enabled || false,
      is_active: service.is_active || true,
    });
    setEditingService(service);
  };

  const filteredServices = services?.filter(service =>
    service.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    service.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // INSTANT RENDER - No blocking loader

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  const categories = ['Instagram Views', 'Instagram Likes', 'Instagram Followers', 'TikTok Views', 'TikTok Likes', 'YouTube Views', 'Twitter/X'];

  return (
    <DashboardLayout>
      <div className="space-y-8">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link to="/admin" className="p-2 hover:bg-secondary rounded-lg transition-colors">
              <ArrowLeft className="h-5 w-5" />
            </Link>
            <div>
              <h1 className="text-3xl font-bold mb-1">Manage Services</h1>
              <p className="text-muted-foreground">Add, edit and manage your services</p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="outline"
              className="gap-2"
              disabled={isSyncingPrices}
              onClick={() => runSyncPrices()}
            >
              {isSyncingPrices ? <Loader2 className="h-4 w-4 animate-spin" /> : <RefreshCw className="h-4 w-4" />}
              {isSyncingPrices ? 'Syncing…' : 'Refresh Prices'}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => setShowImportDialog(true)}
            >
              <Download className="h-4 w-4" />
              Import from Provider
            </Button>
            <Dialog open={showAddService} onOpenChange={setShowAddService}>
              <DialogTrigger asChild>
                <Button variant="gradient" className="gap-2">
                  <Plus className="h-4 w-4" />
                  Add Service
                </Button>
              </DialogTrigger>
              <DialogContent className="glass-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Add New Service</DialogTitle>
                </DialogHeader>
                <ServiceForm
                  formData={formData}
                  setFormData={setFormData}
                  onSubmit={() => addServiceMutation.mutate()}
                  isLoading={addServiceMutation.isPending}
                  categories={categories}
                />
              </DialogContent>
            </Dialog>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search services..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10 input-glass"
          />
        </div>

        {/* Services Table */}
        <div className="glass-card overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            </div>
          ) : filteredServices && filteredServices.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-secondary/50">
                  <tr>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Service</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Category</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Min/Max</th>
                    <th className="px-4 py-3 text-left text-sm font-medium text-muted-foreground">Status</th>
                    <th className="px-4 py-3 text-right text-sm font-medium text-muted-foreground">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {filteredServices.map((service) => (
                    <tr key={service.id} className="hover:bg-secondary/20 transition-colors">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium">{service.name}</p>
                          <p className="text-xs text-muted-foreground">ID: {service.provider_service_id}</p>
                        </div>
                      </td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">{service.category}</td>
                      <td className="px-4 py-4 text-sm text-muted-foreground">
                        {service.min_quantity.toLocaleString()} / {service.max_quantity.toLocaleString()}
                      </td>
                      <td className="px-4 py-4">
                        <Switch
                          checked={service.is_active || false}
                          onCheckedChange={() => toggleServiceMutation.mutate({ id: service.id, is_active: service.is_active || false })}
                        />
                      </td>
                      <td className="px-4 py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditDialog(service)}
                          >
                            <Edit2 className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-destructive hover:text-destructive"
                            onClick={() => {
                              if (confirm('Are you sure you want to delete this service?')) {
                                deleteServiceMutation.mutate(service.id);
                              }
                            }}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="p-12 text-center">
              <Package className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <p className="text-muted-foreground">No services found</p>
            </div>
          )}
        </div>

        {/* Edit Dialog */}
        <Dialog open={!!editingService} onOpenChange={(open) => !open && setEditingService(null)}>
          <DialogContent className="glass-card border-border max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit Service</DialogTitle>
            </DialogHeader>
            <ServiceForm
              formData={formData}
              setFormData={setFormData}
              onSubmit={() => updateServiceMutation.mutate()}
              isLoading={updateServiceMutation.isPending}
              categories={categories}
              isEdit
            />
          </DialogContent>
        </Dialog>

        {/* Import Dialog */}
        <ImportServicesDialog
          open={showImportDialog}
          onOpenChange={setShowImportDialog}
          onImportSuccess={() => queryClient.invalidateQueries({ queryKey: ['admin-all-services'] })}
        />
      </div>
    </DashboardLayout>
  );
}

interface ServiceFormProps {
  formData: {
    provider_id: string;
    provider_service_id: string;
    name: string;
    category: string;
    description: string;
    price: string;
    min_quantity: string;
    max_quantity: string;
    speed: string;
    quality: string;
    drip_feed_enabled: boolean;
    is_active: boolean;
  };
  setFormData: (data: any) => void;
  onSubmit: () => void;
  isLoading: boolean;
  categories: string[];
  isEdit?: boolean;
}

function ServiceForm({ formData, setFormData, onSubmit, isLoading, categories, isEdit }: ServiceFormProps) {
  const lookupFn = useServerFn(lookupProviderService);
  const [isFetchingRemote, setIsFetchingRemote] = useState(false);
  const [lookupError, setLookupError] = useState<string | null>(null);
  const [linked, setLinked] = useState<{ name: string; rate: number; min: number; max: number } | null>(null);
  const idFormatError =
    formData.provider_service_id && !/^[0-9]{1,12}$/.test(formData.provider_service_id.trim())
      ? 'Only digits allowed (e.g. 1001)'
      : null;
  const runLookup = async () => {
    const id = formData.provider_service_id.trim();
    if (!formData.provider_id) {
      setLookupError('Select a provider first');
      return;
    }
    if (!/^[0-9]{1,12}$/.test(id)) {
      setLookupError('Provider Service ID must be digits only (e.g. 1001)');
      return;
    }
    setIsFetchingRemote(true);
    setLookupError(null);
    try {
      const svc: any = await lookupFn({ data: { provider_id: formData.provider_id, service_id: id } });
      setFormData({
        ...formData,
        provider_service_id: id,
        name: svc.name,
        category: formData.category || svc.category,
        price: String(svc.rate),
        min_quantity: String(svc.min),
        max_quantity: String(svc.max),
        drip_feed_enabled: !!svc.dripfeed,
      });
      setLinked({ name: svc.name, rate: svc.rate, min: svc.min, max: svc.max });
      toast.success(`Fetched "${svc.name}" from ${formData.provider_id}`);
    } catch (err: any) {
      setLinked(null);
      setLookupError(err?.message || 'Could not reach the provider API. Check the account credentials.');
    } finally {
      setIsFetchingRemote(false);
    }
  };

  const { data: providers } = useQuery({
    queryKey: ['admin-provider-ids'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_accounts')
        .select('provider_id')
        .eq('is_active', true)
        .order('provider_id');
      if (error) throw error;
      const seen = new Set<string>();
      return (data ?? []).filter((r) => !seen.has(r.provider_id) && seen.add(r.provider_id));
    },
  });

  return (
    <div className="space-y-4 mt-4">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Provider</Label>
          <Select
            value={formData.provider_id}
            disabled={isFetchingRemote}
            onValueChange={(v) => { setLinked(null); setFormData({ ...formData, provider_id: v }); }}
          >
            <SelectTrigger className="input-glass">
              <SelectValue placeholder="Select provider" />
            </SelectTrigger>
            <SelectContent>
              {(providers ?? []).map((p) => (
                <SelectItem key={p.provider_id} value={p.provider_id}>{p.provider_id}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Provider Service ID</Label>
          <div className="flex gap-2">
            <Input
              placeholder="e.g., 1001"
              inputMode="numeric"
              disabled={isFetchingRemote}
              value={formData.provider_service_id}
              onChange={(e) => {
                setLinked(null);
                setLookupError(null);
                setFormData({ ...formData, provider_service_id: e.target.value.replace(/[^0-9]/g, '') });
              }}
              className="input-glass"
            />
            <Button
              type="button"
              variant="outline"
              disabled={isFetchingRemote || !formData.provider_id || !formData.provider_service_id || !!idFormatError}
              onClick={() => runLookup()}
            >
              {isFetchingRemote ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Fetch'}
            </Button>
          </div>
          {idFormatError && <p className="text-xs text-destructive">{idFormatError}</p>}
          {lookupError && (
            <div className="flex items-start justify-between gap-2 rounded-md border border-destructive/40 bg-destructive/10 p-2">
              <p className="text-xs text-destructive">{lookupError}</p>
              <Button type="button" size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={() => runLookup()}>
                Retry
              </Button>
            </div>
          )}
        </div>
        {linked && (
          <div className="col-span-2 rounded-md border border-primary/30 bg-primary/5 p-2 text-xs">
            <span className="font-semibold">Linked:</span> {formData.provider_id} · #{formData.provider_service_id} —{' '}
            {linked.name} · rate {linked.rate}/1K · {linked.min}–{linked.max}
          </div>
        )}
        <div className="space-y-2">
          <Label>Category</Label>
          <Select value={formData.category} onValueChange={(v) => setFormData({ ...formData, category: v })}>
            <SelectTrigger className="input-glass">
              <SelectValue placeholder="Select category" />
            </SelectTrigger>
            <SelectContent>
              {categories.map((cat) => (
                <SelectItem key={cat} value={cat}>{cat}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-2">
        <Label>Service Name</Label>
        <Input
          placeholder="e.g., Instagram Views - High Quality"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="input-glass"
        />
      </div>

      <div className="space-y-2">
        <Label>Description (optional)</Label>
        <Input
          placeholder="Service description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="input-glass"
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="space-y-2">
          <Label>Price per 1K</Label>
          <Input
            type="number"
            step="0.01"
            placeholder="0.50"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: e.target.value })}
            className="input-glass"
          />
        </div>
        <div className="space-y-2">
          <Label>Min Qty</Label>
          <Input
            type="number"
            value={formData.min_quantity}
            onChange={(e) => setFormData({ ...formData, min_quantity: e.target.value })}
            className="input-glass"
          />
        </div>
        <div className="space-y-2">
          <Label>Max Qty</Label>
          <Input
            type="number"
            value={formData.max_quantity}
            onChange={(e) => setFormData({ ...formData, max_quantity: e.target.value })}
            className="input-glass"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Speed</Label>
          <Select value={formData.speed} onValueChange={(v) => setFormData({ ...formData, speed: v })}>
            <SelectTrigger className="input-glass">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="instant">Instant</SelectItem>
              <SelectItem value="fast">Fast</SelectItem>
              <SelectItem value="medium">Medium</SelectItem>
              <SelectItem value="slow">Slow</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Quality</Label>
          <Select value={formData.quality} onValueChange={(v) => setFormData({ ...formData, quality: v })}>
            <SelectTrigger className="input-glass">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="standard">Standard</SelectItem>
              <SelectItem value="high">High</SelectItem>
              <SelectItem value="premium">Premium</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
        <div>
          <p className="font-medium text-sm">Enable Drip Feed</p>
          <p className="text-xs text-muted-foreground">Allow organic/drip delivery</p>
        </div>
        <Switch
          checked={formData.drip_feed_enabled}
          onCheckedChange={(v) => setFormData({ ...formData, drip_feed_enabled: v })}
        />
      </div>

      <div className="flex items-center justify-between p-3 rounded-lg bg-secondary/30">
        <div>
          <p className="font-medium text-sm">Active</p>
          <p className="text-xs text-muted-foreground">Show in service list</p>
        </div>
        <Switch
          checked={formData.is_active}
          onCheckedChange={(v) => setFormData({ ...formData, is_active: v })}
        />
      </div>

      <Button
        variant="gradient"
        className="w-full"
        onClick={onSubmit}
        disabled={isLoading || !formData.name || !formData.category || !formData.price}
      >
        {isLoading ? (
          <>
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
            {isEdit ? 'Updating...' : 'Adding...'}
          </>
        ) : (
          isEdit ? 'Update Service' : 'Add Service'
        )}
      </Button>
    </div>
  );
}
