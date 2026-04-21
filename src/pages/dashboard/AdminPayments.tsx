import { useEffect, useMemo, useState } from "react";
import {
  Invoice,
  Payment,
  Payout,
  PaymentStatus,
  PayoutStatus,
  formatMoney,
  listAllInvoices,
  listAllPayments,
  listAllPayouts,
  setPaymentStatus,
  setPayoutStatus,
} from "@/lib/payments";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { toast } from "@/hooks/use-toast";
import { DollarSign, ArrowDownToLine, FileText, Loader2 } from "lucide-react";

const statusColor: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  paid: "bg-primary/15 text-primary border-primary/30",
  refunded: "bg-accent/15 text-accent border-accent/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  requested: "bg-muted text-muted-foreground",
  approved: "bg-accent/15 text-accent border-accent/30",
  rejected: "bg-destructive/15 text-destructive border-destructive/30",
  draft: "bg-muted text-muted-foreground",
  issued: "bg-accent/15 text-accent border-accent/30",
  void: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function AdminPayments() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);

  const refresh = async () => {
    setLoading(true);
    try {
      const [p, po, inv] = await Promise.all([listAllPayments(), listAllPayouts(), listAllInvoices()]);
      setPayments(p);
      setPayouts(po);
      setInvoices(inv);
    } catch (err) {
      toast({ title: "Failed to load", description: String(err), variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { refresh(); }, []);

  const totals = useMemo(() => {
    const collected = payments.filter((p) => p.status === "paid").reduce((s, p) => s + Number(p.amount), 0);
    const pending = payments.filter((p) => p.status === "pending").reduce((s, p) => s + Number(p.amount), 0);
    const owedPayouts = payouts.filter((p) => p.status === "requested" || p.status === "approved").reduce((s, p) => s + Number(p.amount), 0);
    return { collected, pending, owedPayouts };
  }, [payments, payouts]);

  const updPayment = async (id: string, status: PaymentStatus) => {
    setBusy(id);
    try {
      await setPaymentStatus(id, status);
      toast({ title: `Payment marked ${status}` });
      await refresh();
    } catch (err) {
      toast({ title: "Update failed", description: String(err), variant: "destructive" });
    } finally { setBusy(null); }
  };

  const updPayout = async (id: string, status: PayoutStatus) => {
    setBusy(id);
    try {
      await setPayoutStatus(id, status);
      toast({ title: `Payout ${status}` });
      await refresh();
    } catch (err) {
      toast({ title: "Update failed", description: String(err), variant: "destructive" });
    } finally { setBusy(null); }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Payments</h1>
        <p className="mt-1 text-muted-foreground">
          Manual processing dashboard. Stripe integration is not yet wired — mark payments as paid manually for now.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Stat icon={<DollarSign className="h-5 w-5" />} label="Collected" value={formatMoney(totals.collected)} accent />
        <Stat icon={<DollarSign className="h-5 w-5" />} label="Pending" value={formatMoney(totals.pending)} />
        <Stat icon={<ArrowDownToLine className="h-5 w-5" />} label="Owed payouts" value={formatMoney(totals.owedPayouts)} />
      </div>

      <Tabs defaultValue="payments">
        <TabsList>
          <TabsTrigger value="payments">Payments</TabsTrigger>
          <TabsTrigger value="payouts">Payouts</TabsTrigger>
          <TabsTrigger value="invoices">Invoices</TabsTrigger>
        </TabsList>

        <TabsContent value="payments">
          <Card><CardContent className="p-0">
            {loading ? <P>Loading…</P> : payments.length === 0 ? <P>No payments yet.</P> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Date</TableHead><TableHead>Project</TableHead><TableHead>Student</TableHead>
                  <TableHead>Amount</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {payments.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="font-mono text-xs">{p.project_id.slice(0,8)}</TableCell>
                      <TableCell className="font-mono text-xs">{p.student_id.slice(0,8)}</TableCell>
                      <TableCell className="font-medium">{formatMoney(Number(p.amount), p.currency)}</TableCell>
                      <TableCell><Badge variant="outline" className={statusColor[p.status]}>{p.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin ml-auto" /> : (
                          <div className="flex gap-2 justify-end">
                            {p.status !== "paid" && <Button size="sm" variant="outline" onClick={() => updPayment(p.id, "paid")}>Mark paid</Button>}
                            {p.status === "paid" && <Button size="sm" variant="outline" onClick={() => updPayment(p.id, "refunded")}>Refund</Button>}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="payouts">
          <Card><CardContent className="p-0">
            {loading ? <P>Loading…</P> : payouts.length === 0 ? <P>No payout requests.</P> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Requested</TableHead><TableHead>Expert</TableHead><TableHead>Amount</TableHead>
                  <TableHead>Method</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {payouts.map((p) => (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{new Date(p.requested_at).toLocaleDateString()}</TableCell>
                      <TableCell className="font-mono text-xs">{p.expert_id.slice(0,8)}</TableCell>
                      <TableCell className="font-medium">{formatMoney(Number(p.amount), p.currency)}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{p.method ?? "—"}</TableCell>
                      <TableCell><Badge variant="outline" className={statusColor[p.status]}>{p.status}</Badge></TableCell>
                      <TableCell className="text-right">
                        {busy === p.id ? <Loader2 className="h-4 w-4 animate-spin ml-auto" /> : (
                          <div className="flex gap-2 justify-end">
                            {p.status === "requested" && <>
                              <Button size="sm" variant="outline" onClick={() => updPayout(p.id, "approved")}>Approve</Button>
                              <Button size="sm" variant="outline" onClick={() => updPayout(p.id, "rejected")}>Reject</Button>
                            </>}
                            {p.status === "approved" && <Button size="sm" onClick={() => updPayout(p.id, "paid")}>Mark paid</Button>}
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>

        <TabsContent value="invoices">
          <Card><CardContent className="p-0">
            {loading ? <P>Loading…</P> : invoices.length === 0 ? <P>No invoices yet.</P> : (
              <Table>
                <TableHeader><TableRow>
                  <TableHead>Number</TableHead><TableHead>Date</TableHead><TableHead>Student</TableHead>
                  <TableHead>Amount</TableHead><TableHead>Status</TableHead>
                </TableRow></TableHeader>
                <TableBody>
                  {invoices.map((i) => (
                    <TableRow key={i.id}>
                      <TableCell className="font-mono text-xs flex items-center gap-2"><FileText className="h-3 w-3" />{i.invoice_number}</TableCell>
                      <TableCell className="text-sm">{new Date(i.created_at).toLocaleDateString()}</TableCell>
                      <TableCell className="font-mono text-xs">{i.student_id.slice(0,8)}</TableCell>
                      <TableCell className="font-medium">{formatMoney(Number(i.amount), i.currency)}</TableCell>
                      <TableCell><Badge variant="outline" className={statusColor[i.status]}>{i.status}</Badge></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent></Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ icon, label, value, accent }: { icon: React.ReactNode; label: string; value: string; accent?: boolean }) {
  return (
    <Card className={accent ? "border-accent/40" : undefined}>
      <CardContent className="p-5">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">{icon}{label}</div>
        <div className="mt-2 font-display text-2xl font-bold">{value}</div>
      </CardContent>
    </Card>
  );
}

function P({ children }: { children: React.ReactNode }) {
  return <p className="p-6 text-sm text-muted-foreground">{children}</p>;
}