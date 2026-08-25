import { useState, useEffect } from "react";
import { useCurrency } from "@/hooks/useCurrency";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { Pencil, Save, X, Loader2, Hash, Wallet, AlertTriangle } from "lucide-react";
import { DateTimePicker } from "./DateTimePicker";

interface EditRunDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  run: {
    id: string;
    quantity: number;
    scheduledAt: string;
    engagementType?: string;
    runNumber?: number;
  } | null;
  onSave: (data: { runId: string; quantity: number; scheduledAt: string }) => void;
  isSaving?: boolean;
  // NEW: Wallet & pricing props
  walletBalance?: number;
  pricePerThousand?: number; // Price per 1000 units
}

export function EditRunDialog({ 
  open, 
  onOpenChange, 
  run, 
  onSave, 
  isSaving = false,
  walletBalance = 0,
  pricePerThousand = 0.1, // Default price per 1000
}: EditRunDialogProps) {
  const { formatPrice } = useCurrency();
  const [quantity, setQuantity] = useState("");
  const [scheduledDate, setScheduledDate] = useState<Date>(new Date());

  // Reset form when run changes
  useEffect(() => {
    if (run) {
      setQuantity(run.quantity.toString());
      setScheduledDate(new Date(run.scheduledAt));
    }
  }, [run]);

  const parsedQuantity = parseInt(quantity) || 0;
  const quantityDifference = run ? parsedQuantity - run.quantity : 0;
  
  // Calculate extra cost for increased quantity
  const extraCost = quantityDifference > 0 
    ? (quantityDifference / 1000) * pricePerThousand 
    : 0;
  
  // Check if user has sufficient balance
  const hasInsufficientBalance = extraCost > walletBalance;

  const handleSave = () => {
    if (!run) return;
    if (hasInsufficientBalance) return; // Block save if insufficient balance
    const qty = parseInt(quantity) || 1;
    onSave({ runId: run.id, quantity: qty, scheduledAt: scheduledDate.toISOString() });
  };

  const hasQuantityChanged = run && parsedQuantity !== run.quantity;
  const originalDate = run ? new Date(run.scheduledAt) : new Date();
  const hasTimeChanged = run && scheduledDate.getTime() !== originalDate.getTime();
  const hasChanges = hasQuantityChanged || hasTimeChanged;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Pencil className="h-5 w-5 text-primary" />
            Edit Scheduled Run
          </DialogTitle>
          <DialogDescription>
            Modify the quantity or scheduled time for this pending run
          </DialogDescription>
        </DialogHeader>

        {run && (
          <div className="space-y-6 py-4">
            {/* Run Info */}
            <div className="flex items-center gap-3 p-3 bg-muted/50 rounded-lg">
              <Badge variant="outline" className="capitalize">
                {run.engagementType || 'Unknown'}
              </Badge>
              {run.runNumber && (
                <span className="text-sm text-muted-foreground">
                  Run #{run.runNumber}
                </span>
              )}
            </div>

            {/* Quantity Input */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Hash className="h-4 w-4" />
                Quantity to Deliver
              </Label>
              <Input
                type="number"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                min={1}
                className="text-lg font-mono"
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Original:</span>
                <span className="font-mono font-medium">{run.quantity}</span>
                {hasQuantityChanged && (
                  <Badge variant="secondary" className={`text-xs ${
                    parsedQuantity > run.quantity 
                      ? 'bg-green-100 text-green-700' 
                      : 'bg-red-100 text-red-700'
                  }`}>
                    {parsedQuantity > run.quantity ? '+' : ''}{quantityDifference}
                  </Badge>
                )}
              </div>
            </div>

            {/* Extra Cost Warning - Only show when quantity increased */}
            {quantityDifference > 0 && (
              <div className={`p-3 rounded-lg border ${
                hasInsufficientBalance 
                  ? 'bg-red-50 dark:bg-red-950/30 border-red-300' 
                  : 'bg-blue-50 dark:bg-blue-950/30 border-blue-300'
              }`}>
                <div className="flex items-center gap-2 mb-2">
                  <Wallet className={`h-4 w-4 ${hasInsufficientBalance ? 'text-red-600' : 'text-blue-600'}`} />
                  <span className={`text-sm font-medium ${hasInsufficientBalance ? 'text-red-700' : 'text-blue-700'}`}>
                    Extra Charge
                  </span>
                </div>
                <div className="space-y-1 text-sm">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Extra {quantityDifference.toLocaleString()} units:</span>
                    <span className={`font-bold ${hasInsufficientBalance ? 'text-red-600' : 'text-blue-600'}`}>
                      {formatPrice(extraCost)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Wallet Balance:</span>
                    <span className={`font-medium ${hasInsufficientBalance ? 'text-red-600' : 'text-foreground'}`}>
                      {formatPrice(walletBalance)}
                    </span>
                  </div>
                </div>
                
                {hasInsufficientBalance && (
                  <div className="mt-2 pt-2 border-t border-red-200 flex items-center gap-2 text-red-600">
                    <AlertTriangle className="h-4 w-4" />
                    <span className="text-xs font-medium">Insufficient balance! Please add funds to your wallet.</span>
                  </div>
                )}
              </div>
            )}

            {/* Time Input */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                📅 Scheduled Time
              </Label>
              <DateTimePicker
                value={scheduledDate}
                onChange={setScheduledDate}
              />
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                <span>Original:</span>
                <span className="font-medium">{format(new Date(run.scheduledAt), 'MMM d, HH:mm')}</span>
                {hasTimeChanged && (
                  <Badge variant="secondary" className="text-xs bg-blue-100 text-blue-700">
                    ⏰ Changed
                  </Badge>
                )}
              </div>
            </div>

            {/* Warning */}
            {hasChanges && !hasInsufficientBalance && (
              <div className="p-3 bg-amber-50 dark:bg-amber-950/30 border border-amber-200 rounded-lg text-sm">
                <p className="text-amber-700">
                  ⚠️ Variance will be reset to 0 when manually editing
                </p>
              </div>
            )}
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            <X className="h-4 w-4 mr-2" />
            Cancel
          </Button>
          <Button 
            onClick={handleSave}
            disabled={isSaving || !hasChanges || hasInsufficientBalance}
          >
            {isSaving ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            {extraCost > 0 ? `Save & Pay ${formatPrice(extraCost)}` : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
