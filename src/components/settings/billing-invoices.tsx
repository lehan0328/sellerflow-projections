import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Download, ExternalLink, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Invoice {
  id: string;
  number: string | null;
  status: string | null;
  amount_due: number;
  amount_paid: number;
  currency: string;
  created: number;
  due_date: number | null;
  paid_at: number | null;
  invoice_pdf: string | null;
  hosted_invoice_url: string | null;
  period_start: number;
  period_end: number;
}

export function BillingInvoices() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['invoices'],
    staleTime: 5 * 60 * 1000, // 5 minutes - invoices change moderately
    queryFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error('No session');

      const { data, error } = await supabase.functions.invoke('get-invoices', {
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;
      return data as { invoices: Invoice[] };
    },
  });

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency || 'USD',
    }).format(amount);
  };

  const getStatusBadge = (status: string | null) => {
    switch (status) {
      case 'paid':
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Paid</Badge>;
      case 'open':
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Open</Badge>;
      case 'draft':
        return <Badge className="bg-gray-500/10 text-gray-500 hover:bg-gray-500/20">Draft</Badge>;
      case 'uncollectible':
        return <Badge variant="destructive">Uncollectible</Badge>;
      case 'void':
        return <Badge variant="outline">Void</Badge>;
      default:
        return <Badge variant="secondary">{status}</Badge>;
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Billing & Invoices</span>
          </CardTitle>
          <CardDescription>
            View and download your subscription invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        </CardContent>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Billing & Invoices</span>
          </CardTitle>
          <CardDescription>
            View and download your subscription invoices
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-sm text-muted-foreground">
              Unable to load invoices. Please try again later.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const invoices = data?.invoices || [];

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center space-x-2">
          <FileText className="h-5 w-5" />
          <span>Billing & Invoices</span>
        </CardTitle>
        <CardDescription>
          View and download your subscription invoices. Invoices are automatically emailed when your subscription renews.
        </CardDescription>
      </CardHeader>
      <CardContent>
        {invoices.length === 0 ? (
          <div className="text-center py-8">
            <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-3" />
            <p className="text-sm text-muted-foreground">
              No invoices found. Invoices will appear here once you have an active subscription.
            </p>
          </div>
        ) : (
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Invoice</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {invoices.map((invoice) => (
                  <TableRow key={invoice.id}>
                    <TableCell className="font-medium">
                      {invoice.number || invoice.id.substring(0, 16)}
                    </TableCell>
                    <TableCell>{formatDate(invoice.created)}</TableCell>
                    <TableCell>
                      {formatAmount(invoice.amount_due, invoice.currency)}
                    </TableCell>
                    <TableCell>{getStatusBadge(invoice.status)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        {invoice.invoice_pdf && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              window.open(invoice.invoice_pdf!, '_blank');
                              toast.success('Opening invoice PDF');
                            }}
                          >
                            <Download className="h-4 w-4 mr-1" />
                            PDF
                          </Button>
                        )}
                        {invoice.hosted_invoice_url && (
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              window.open(invoice.hosted_invoice_url!, '_blank');
                              toast.success('Opening invoice page');
                            }}
                          >
                            <ExternalLink className="h-4 w-4 mr-1" />
                            View
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}