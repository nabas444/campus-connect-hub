import { useEffect, useMemo, useState } from "react";
import { useAuth } from "@/hooks/useAuth";
import {
  Earning,
  Payout,
  formatMoney,
  listMyEarnings,
  listMyPayouts,
  requestPayout,
} from "@/lib/payments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Wallet, ArrowDownToLine, Clock, CheckCircle2 } from "lucide-react";

const statusColor: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  available: "bg-accent/15 text-accent border-accent/30",
  paid_out: "bg-primary/15 text-primary border-primary/30",
  requested: "bg-muted text-muted-foreground",
  approved: "bg-accent/15 text-accent border-accent/30",
  paid: "bg-primary/15 text-primary border-primary/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function Earnings() {
  const { user } = useAuth();
  const [earnings, setEarnings] = useState<Earning[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("");
  const [notes, setNotes] = useState("");

  const refresh = async () => {
    setLoading(true);
    try {
      const [e, p] = await Promise.all([listMyEarnings(), listMyPayouts()]);
      setEarnings(e);
      setPayouts(p);
    } catch (err) {
      toast({ title: "Failed to load", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, []);

  const totals = useMemo(() => {
    const available = earnings.filter((e) => e.status === "available").reduce((s, e) => s + Number(e.amount), 0);
    const pending = earnings.filter((e) => e.status === "pending").reduce((s, e) => s + Number(e.amount), 0);
    const paidOut = earnings.filter((e) => e.status === "paid_out").reduce((s, e) => s + Number(e.amount), 0);
    return { available, pending, paidOut };
  }, [earnings]);

  const submit = async () => {
    if (!user) return;
    const amt = parseFloat(amount);
    if (!amt || amt <= 0) {
      toast({ title: "Enter a valid amount", variant: "destructive" });
      return;
    }
    if (amt > totals.available) {
      toast({ title: "Amount exceeds available balance", variant: "destructive" });
      return;
    }
    try {
      await requestPayout(user.id, amt, method || undefined, notes || undefined);
      toast({ title: "Payout requested" });
      setOpen(false);
      setAmount("");
      setMethod("");
      setNotes("");
      refresh();
    } catch (err) {
      toast({ title: "Request failed", description: String(err), variant: "destructive" });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h1 className="font-display text-3xl font-bold">Earnings</h1>
          <p className="mt-1 text-muted-foreground">Track approved milestone payouts and request withdrawals.</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button variant="hero" disabled={totals.available <= 0}>
              <ArrowDownToLine className="h-4 w-4" />
              Request payout
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request a payout</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Amount (USD)</Label>
                <Input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={totals.available.toFixed(2)}
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  Available: {formatMoney(totals.available)}
                </p>
              </div>
              <div>
                <Label>Method (optional)</Label>
                <Input value={method} onChange={(e) => setMethod(e.target.value)} placeholder="Bank transfer, PayPal…" />
              </div>
              <div>
                <Label>Notes (optional)</Label>
                <Textarea value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
              <Button onClick={submit}>Submit request</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard icon={<Wallet className="h-5 w-5" />} label="Available" value={formatMoney(totals.available)} accent />
        <StatCard icon={<Clock className="h-5 w-5" />} label="Pending" value={formatMoney(totals.pending)} />
        <StatCard icon={<CheckCircle2 className="h-5 w-5" />} label="Paid out" value={formatMoney(totals.paidOut)} />
      </div>

      <Card>
        <CardHeader><CardTitle className="text-lg">Earnings ledger</CardTitle></CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : earnings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No earnings yet. Approved milestones will appear here.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Project</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {earnings.map((e) => (
                  <TableRow key={e.id}>
                    <TableCell className="text-sm">{new Date(e.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono text-xs">{e.project_id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{formatMoney(Number(e.amount), e.currency)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColor[e.status]}>{e.status.replace("_", " ")}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader><CardTitle className="text-lg">Payout history</CardTitle></CardHeader>
        <CardContent>
          {payouts.length === 0 ? (
            <p className="text-sm text-muted-foreground">No payout requests yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Requested</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {payouts.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{new Date(p.requested_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{formatMoney(Number(p.amount), p.currency)}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{p.method ?? "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColor[p.status]}>{p.status}</Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-accent/40" : undefined}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div>
        <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}