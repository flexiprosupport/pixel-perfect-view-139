import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { 
  Search, 
  Loader2, 
  Download, 
  Package,
  Check,
  AlertCircle
} from 'lucide-react';
import { toast } from 'sonner';
import { ScrollArea } from '@/components/ui/scroll-area';

interface ProviderService {
  service_id: string;
  name: string;
  category: string;
  rate: number;
  min: number;
  max: number;
  dripfeed: boolean;
  refill: boolean;
}

interface ImportServicesDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onImportSuccess: () => void;
}

export function ImportServicesDialog({ open, onOpenChange, onImportSuccess }: ImportServicesDialogProps) {
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedServices, setSelectedServices] = useState<Set<string>>(new Set());
  const [markupPercent, setMarkupPercent] = useState(0);

  // Fetch unique providers from provider_accounts
  const { data: providers } = useQuery({
    queryKey: ['admin-provider-accounts-unique'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('provider_accounts')
        .select('provider_id, name, api_url')
        .eq('is_active', true)
        .order('provider_id');
      
      if (error) throw error;
      
      // Deduplicate by provider_id, keep first account's info
      const uniqueMap = new Map<string, { id: string; name: string }>();
      for (const acc of data || []) {
        if (!uniqueMap.has(acc.provider_id)) {
          uniqueMap.set(acc.provider_id, { id: acc.provider_id, name: `${acc.provider_id} (${acc.name})` });
        }
      }
      return Array.from(uniqueMap.values());
    },
  });

  // Fetch services from provider API
  const { data: providerServices, isLoading: loadingServices, refetch: fetchServices, isFetching } = useQuery({
    queryKey: ['provider-services', selectedProvider, searchQuery],
    queryFn: async () => {
      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('import-services', {
        body: {
          provider_id: selectedProvider,
          action: 'fetch',
          search_query: searchQuery,
          markup_percent: markupPercent,
        },
      });

      if (response.error) throw response.error;
      return response.data as { services: ProviderService[]; total: number; filtered: number };
    },
    enabled: !!selectedProvider,
  });

  // Import selected services
  const importMutation = useMutation({
    mutationFn: async () => {
      if (selectedServices.size === 0) {
        throw new Error('No services selected');
      }

      const { data: session } = await supabase.auth.getSession();
      if (!session.session) throw new Error('Not authenticated');

      const response = await supabase.functions.invoke('import-services', {
        body: {
          provider_id: selectedProvider,
          action: 'import',
          service_ids: Array.from(selectedServices),
          markup_percent: markupPercent,
        },
      });

      if (response.error) throw response.error;
      return response.data;
    },
    onSuccess: (data) => {
      toast.success(`Successfully imported ${data.imported} services${data.updated > 0 ? `, updated ${data.updated}` : ''}`);
      setSelectedServices(new Set());
      onImportSuccess();
      onOpenChange(false);
    },
    onError: (error: Error) => {
      toast.error(error.message);
    },
  });

  const toggleService = (serviceId: string) => {
    const newSelected = new Set(selectedServices);
    if (newSelected.has(serviceId)) {
      newSelected.delete(serviceId);
    } else {
      newSelected.add(serviceId);
    }
    setSelectedServices(newSelected);
  };

  const toggleAll = () => {
    if (!providerServices?.services) return;
    
    if (selectedServices.size === providerServices.services.length) {
      setSelectedServices(new Set());
    } else {
      setSelectedServices(new Set(providerServices.services.map(s => s.service_id)));
    }
  };

  const handleSearch = () => {
    fetchServices();
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="glass-card border-border max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Import Services from Provider
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 flex-1 overflow-hidden flex flex-col">
          {/* Provider & Markup Selection */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Select Provider</label>
              <Select value={selectedProvider} onValueChange={setSelectedProvider}>
                <SelectTrigger className="input-glass">
                  <SelectValue placeholder="Choose a provider" />
                </SelectTrigger>
                <SelectContent>
                  {providers?.map((provider) => (
                    <SelectItem key={provider.id} value={provider.id}>
                      {provider.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Markup %</label>
              <Input
                type="number"
                value={markupPercent}
                onChange={(e) => setMarkupPercent(parseInt(e.target.value) || 0)}
                className="input-glass"
                min={0}
                max={500}
              />
            </div>
          </div>

          {/* Search */}
          {selectedProvider && (
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by ID, name, or category..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  className="pl-10 input-glass"
                />
              </div>
              <Button onClick={handleSearch} disabled={isFetching}>
                {isFetching ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Search'}
              </Button>
            </div>
          )}

          {/* Services List */}
          {selectedProvider && (
            <div className="flex-1 overflow-hidden flex flex-col">
              {loadingServices || isFetching ? (
                <div className="flex-1 flex items-center justify-center">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : providerServices?.services && providerServices.services.length > 0 ? (
                <>
                  {/* Header with select all */}
                  <div className="flex items-center justify-between py-2 px-3 bg-secondary/30 rounded-t-lg">
                    <div className="flex items-center gap-2">
                      <Checkbox
                        checked={selectedServices.size === providerServices.services.length}
                        onCheckedChange={toggleAll}
                      />
                      <span className="text-sm text-muted-foreground">
                        {selectedServices.size} of {providerServices.services.length} selected
                      </span>
                    </div>
                    <span className="text-xs text-muted-foreground">
                      Total: {providerServices.total} | Showing: {providerServices.filtered}
                    </span>
                  </div>

                  {/* Services table */}
                  <ScrollArea className="flex-1 border border-border rounded-b-lg">
                    <table className="w-full">
                      <thead className="bg-secondary/50 sticky top-0">
                        <tr>
                          <th className="w-10 px-3 py-2"></th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">ID</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Name</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Category</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Rate/1K</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-muted-foreground">Min/Max</th>
                          <th className="px-3 py-2 text-center text-xs font-medium text-muted-foreground">Drip</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {providerServices.services.map((service) => (
                          <tr 
                            key={service.service_id} 
                            className={`hover:bg-secondary/20 cursor-pointer transition-colors ${
                              selectedServices.has(service.service_id) ? 'bg-primary/10' : ''
                            }`}
                            onClick={() => toggleService(service.service_id)}
                          >
                            <td className="px-3 py-2">
                              <Checkbox
                                checked={selectedServices.has(service.service_id)}
                                onCheckedChange={() => toggleService(service.service_id)}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </td>
                            <td className="px-3 py-2 text-xs font-mono text-muted-foreground">
                              {service.service_id}
                            </td>
                            <td className="px-3 py-2 text-sm">
                              <div className="max-w-xs truncate" title={service.name}>
                                {service.name}
                              </div>
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {service.category}
                            </td>
                            <td className="px-3 py-2 text-sm font-medium text-success">
                              ${(service.rate * (1 + markupPercent / 100)).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-xs text-muted-foreground">
                              {service.min.toLocaleString()} / {service.max.toLocaleString()}
                            </td>
                            <td className="px-3 py-2 text-center">
                              {service.dripfeed ? (
                                <Check className="h-4 w-4 text-success mx-auto" />
                              ) : (
                                <span className="text-muted-foreground">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </ScrollArea>
                </>
              ) : providerServices ? (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  <Package className="h-12 w-12 mb-2" />
                  <p>No services found</p>
                  <p className="text-xs">Try a different search</p>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-muted-foreground">
                  <AlertCircle className="h-12 w-12 mb-2" />
                  <p>Search for services to import</p>
                </div>
              )}
            </div>
          )}

          {/* Import Button */}
          {selectedServices.size > 0 && (
            <Button
              variant="gradient"
              className="w-full"
              onClick={() => importMutation.mutate()}
              disabled={importMutation.isPending}
            >
              {importMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Importing...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Import {selectedServices.size} Service{selectedServices.size > 1 ? 's' : ''}
                </>
              )}
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
