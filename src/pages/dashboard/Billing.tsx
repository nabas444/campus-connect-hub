import { useEffect, useState } from "react";
import { Invoice, Payment, formatMoney, listMyInvoices, listMyPayments } from "@/lib/payments";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { toast } from "@/hooks/use-toast";
import { Receipt, CreditCard } from "lucide-react";

const statusColor: Record<string, string> = {
  pending: "bg-muted text-muted-foreground",
  paid: "bg-primary/15 text-primary border-primary/30",
  refunded: "bg-accent/15 text-accent border-accent/30",
  failed: "bg-destructive/15 text-destructive border-destructive/30",
  draft: "bg-muted text-muted-foreground",
  issued: "bg-accent/15 text-accent border-accent/30",
  void: "bg-destructive/15 text-destructive border-destructive/30",
};

export default function Billing() {
  const [payments, setPayments] = useState<Payment[]>([]);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const [p, i] = await Promise.all([listMyPayments(), listMyInvoices()]);
        setPayments(p);
        setInvoices(i);
      } catch (err) {
        toast({ title: "Failed to load", description: String(err), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold">Billing</h1>
        <p className="mt-1 text-muted-foreground">
          Your payments and invoices. Online payment processing will be enabled in a future update.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <CreditCard className="h-5 w-5 text-accent" /> Payments
          </CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading…</p>
          ) : payments.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No payments yet. Charges will appear here once an expert is assigned to your project.
            </p>
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
                {payments.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="text-sm">{new Date(p.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-mono text-xs">{p.project_id.slice(0, 8)}</TableCell>
                    <TableCell className="font-medium">{formatMoney(Number(p.amount), p.currency)}</TableCell>
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

      <Card>
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <Receipt className="h-5 w-5 text-accent" /> Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          {invoices.length === 0 ? (
            <p className="text-sm text-muted-foreground">No invoices yet.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Number</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell className="font-mono text-xs">{i.invoice_number}</TableCell>
                    <TableCell className="text-sm">{new Date(i.created_at).toLocaleDateString()}</TableCell>
                    <TableCell className="font-medium">{formatMoney(Number(i.amount), i.currency)}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={statusColor[i.status]}>{i.status}</Badge>
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