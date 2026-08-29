import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Paperclip, ReceiptText, Send, X } from "lucide-react";
import type { Json } from "@/integrations/supabase/types";
import {
  MAX_PROOF_FILES,
  PROOF_ACCEPT,
  formatBytes,
  uploadProofFiles,
  validateProofFiles,
} from "@/lib/ticket-attachments";


const ISSUE_TYPES = [
  { value: "non_delivery", label: "Order not delivered at all" },
  { value: "partial_delivery", label: "Partial delivery" },
  { value: "wrong_delivery", label: "Wrong target / wrong service delivered" },
  { value: "wallet_not_credited", label: "Payment debited, wallet not credited" },
  { value: "duplicate_payment", label: "Duplicate payment" },
];

const PAYMENT_METHODS = [
  { value: "upi", label: "UPI / ZapUPI (INR)" },
  { value: "crypto", label: "Crypto" },
  { value: "wallet", label: "Wallet balance" },
  { value: "other", label: "Other" },
];

const REMEDIES = [
  { value: "redelivery", label: "Re-delivery / refill" },
  { value: "wallet_credit", label: "Wallet credit" },
  { value: "original_method", label: "Refund to original payment method" },
];

export function RefundClaimDialog() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);

  const [issueType, setIssueType] = useState("non_delivery");
  const [orderId, setOrderId] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("upi");
  const [paymentRef, setPaymentRef] = useState("");
  const [amount, setAmount] = useState("");
  const [targetUrl, setTargetUrl] = useState("");
  const [orderedOn, setOrderedOn] = useState("");
  const [proof, setProof] = useState("");
  const [remedy, setRemedy] = useState("redelivery");
  const [details, setDetails] = useState("");
  const [files, setFiles] = useState<File[]>([]);
  const [fileErrors, setFileErrors] = useState<string[]>([]);

  const addFiles = (list: FileList | null) => {
    if (!list) return;
    const { accepted, errors } = validateProofFiles(Array.from(list), files);
    if (accepted.length) setFiles((prev) => [...prev, ...accepted]);
    setFileErrors(errors);
    if (errors.length) {
      toast({ title: "Some files were not added", description: errors[0], variant: "destructive" });
    }
  };

  const removeFile = (index: number) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setFileErrors([]);
  };

  const reset = () => {
    setIssueType("non_delivery");
    setOrderId("");
    setPaymentMethod("upi");
    setPaymentRef("");
    setAmount("");
    setTargetUrl("");
    setOrderedOn("");
    setProof("");
    setRemedy("redelivery");
    setDetails("");
    setFiles([]);
    setFileErrors([]);
  };


  const isFundingIssue =
    issueType === "wallet_not_credited" || issueType === "duplicate_payment";

  const submit = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error("Please sign in to raise a refund claim");
      if (!isFundingIssue && !orderId.trim())
        throw new Error("Order ID is required");
      if (isFundingIssue && !paymentRef.trim())
        throw new Error("Payment reference / transaction hash is required");
      if (!proof.trim() && files.length === 0)
        throw new Error("Please add proof — attach a file or describe your evidence");

      const issueLabel =
        ISSUE_TYPES.find((i) => i.value === issueType)?.label ?? issueType;
      const methodLabel =
        PAYMENT_METHODS.find((p) => p.value === paymentMethod)?.label ?? paymentMethod;
      const remedyLabel =
        REMEDIES.find((r) => r.value === remedy)?.label ?? remedy;

      const attachments = await uploadProofFiles(user.id, files);

      const message = [
        `Claim type: ${issueLabel}`,
        `Order ID: ${orderId.trim() || "—"}`,
        `Payment method: ${methodLabel}`,
        `Payment reference / txn hash: ${paymentRef.trim() || "—"}`,
        `Amount: ${amount.trim() || "—"}`,
        `Target URL: ${targetUrl.trim() || "—"}`,
        `Order date/time: ${orderedOn.trim() || "—"}`,
        `Preferred remedy: ${remedyLabel}`,
        "",
        "Proof provided:",
        proof.trim() || "—",
        `Attached files: ${attachments.length ? attachments.map((a) => a.name).join(", ") : "none"}`,
        "",
        "Additional details:",
        details.trim() || "—",
      ].join("\n");

      const { data, error } = await supabase
        .from("support_tickets")
        .insert({
          user_id: user.id,
          subject: `Refund claim — ${issueLabel}${orderId.trim() ? ` (Order ${orderId.trim()})` : ""}`,
          message,
          category: isFundingIssue ? "payment" : "order",
          priority: "high",
          status: "open",
          attachments: attachments as unknown as Json,
        })
        .select()
        .single();

      if (error) throw error;

      // Confirmation receipt — never block ticket creation on email delivery.
      try {
        await sendReceipt({ data: { ticketId: data.id } });
      } catch (e) {
        console.error("ticket receipt email failed", e);
      }

      return data;
    },

    onSuccess: (ticket) => {
      toast({
        title: `Refund claim submitted${ticket?.ticket_number ? ` (${ticket.ticket_number})` : ""}`,
        description:
          "A confirmation receipt is on its way to your email. Typical first response within one business day.",
      });

      queryClient.invalidateQueries({ queryKey: ["support-tickets"] });
      setOpen(false);
      reset();
    },
    onError: (error: Error) => {
      toast({ title: "Could not submit claim", description: error.message, variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" className="gap-2 w-full sm:w-auto">
          <ReceiptText className="h-4 w-4" />
          Refund / Non-delivery
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Refund or non-delivery claim</DialogTitle>
          <DialogDescription>
            Claims must be raised within 7 days as per our Refund Policy. Provide the order ID,
            payment details and proof so we can verify quickly.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label>What went wrong?</Label>
            <Select value={issueType} onValueChange={setIssueType}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {ISSUE_TYPES.map((i) => (
                  <SelectItem key={i.value} value={i.value}>{i.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Order ID {isFundingIssue ? "(optional)" : "*"}</Label>
              <Input
                placeholder="e.g. ORD-10245"
                value={orderId}
                onChange={(e) => setOrderId(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Amount</Label>
              <Input
                placeholder="e.g. 499"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Payment method</Label>
              <Select value={paymentMethod} onValueChange={setPaymentMethod}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PAYMENT_METHODS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>UPI ref / txn hash {isFundingIssue ? "*" : ""}</Label>
              <Input
                placeholder="Transaction reference"
                value={paymentRef}
                onChange={(e) => setPaymentRef(e.target.value)}
              />
            </div>
          </div>

          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Target URL / username</Label>
              <Input
                placeholder="https://instagram.com/..."
                value={targetUrl}
                onChange={(e) => setTargetUrl(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Order date & time</Label>
              <Input
                placeholder="29 Aug 2026, 14:30 IST"
                value={orderedOn}
                onChange={(e) => setOrderedOn(e.target.value)}
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Proof *</Label>
            <Textarea
              placeholder="Paste screenshot links, bank/UPI reference, before-after counts with timestamps. Redact passwords, OTPs and unrelated financial data."
              value={proof}
              onChange={(e) => setProof(e.target.value)}
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label>Attach proof files</Label>
            <Input
              type="file"
              multiple
              accept={PROOF_ACCEPT}
              onChange={(e) => {
                addFiles(e.target.files);
                e.target.value = "";
              }}
            />
            <p className="text-xs text-muted-foreground">
              PNG, JPG, WEBP, GIF or PDF · max 5 MB each · up to {MAX_PROOF_FILES} files.
            </p>
            {fileErrors.length > 0 && (
              <ul className="text-xs text-destructive space-y-1">
                {fileErrors.map((err) => (
                  <li key={err}>{err}</li>
                ))}
              </ul>
            )}
            {files.length > 0 && (
              <ul className="space-y-1">
                {files.map((f, i) => (
                  <li
                    key={`${f.name}-${f.size}`}
                    className="flex items-center justify-between gap-2 rounded-md border border-border px-2 py-1.5 text-xs"
                  >
                    <span className="flex items-center gap-2 truncate">
                      <Paperclip className="h-3.5 w-3.5 shrink-0" />
                      <span className="truncate">{f.name}</span>
                      <span className="text-muted-foreground shrink-0">{formatBytes(f.size)}</span>
                    </span>
                    <button
                      type="button"
                      onClick={() => removeFile(i)}
                      className="text-muted-foreground hover:text-destructive"
                      aria-label={`Remove ${f.name}`}
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>


          <div className="space-y-2">
            <Label>Preferred remedy</Label>
            <Select value={remedy} onValueChange={setRemedy}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {REMEDIES.map((r) => (
                  <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Additional details</Label>
            <Textarea
              placeholder="Anything else that helps us investigate"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              rows={3}
            />
          </div>

          <p className="text-xs text-muted-foreground">
            Never share passwords, OTPs or private keys. Outcome follows the Refund Policy.
          </p>

          <Button
            className="w-full gap-2"
            onClick={() => submit.mutate()}
            disabled={submit.isPending}
          >
            {submit.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
            Submit claim
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
