import { useAmazonTransactions } from "@/hooks/useAmazonTransactions";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ForecastExplainer } from "@/components/ForecastExplainer";

const AmazonTransactionsTest = () => {
  const { amazonTransactions, isLoading } = useAmazonTransactions();
  const navigate = useNavigate();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="ghost" onClick={() => navigate("/")}>
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Button>
        <h1 className="text-3xl font-bold">Amazon Transactions Data Test</h1>
      </div>

      <ForecastExplainer />

      <Card>
        <CardHeader>
          <CardTitle>
            Transaction Count: {amazonTransactions.length}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Showing all available fields from Amazon SP-API
          </p>
        </CardHeader>
        <CardContent>
          <ScrollArea className="w-full">
            <div className="min-w-max">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Gross Amount</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Settlement ID</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>Shipping Cost</TableHead>
                    <TableHead>Ads Cost</TableHead>
                    <TableHead>Return Rate</TableHead>
                    <TableHead>Chargeback Rate</TableHead>
                    <TableHead>Description</TableHead>
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Fee Description</TableHead>
                    <TableHead>Marketplace</TableHead>
                    <TableHead>Currency</TableHead>
                    <TableHead>Amazon Account ID</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {amazonTransactions.map((transaction) => (
                    <TableRow key={transaction.id}>
                      <TableCell className="whitespace-nowrap">
                        {new Date(transaction.transaction_date).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={transaction.transaction_type === 'Order' ? 'default' : 'destructive'}>
                          {transaction.transaction_type}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {transaction.order_id || '-'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {transaction.sku || '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        ${transaction.gross_amount?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="text-right font-semibold">
                        ${transaction.amount?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {transaction.settlement_id || '-'}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {transaction.delivery_date ? new Date(transaction.delivery_date).toLocaleDateString() : '-'}
                      </TableCell>
                      <TableCell className="text-right">
                        ${transaction.shipping_cost?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="text-right">
                        ${transaction.ads_cost?.toFixed(2) || '0.00'}
                      </TableCell>
                      <TableCell className="text-right">
                        {((transaction.return_rate || 0) * 100).toFixed(2)}%
                      </TableCell>
                      <TableCell className="text-right">
                        {((transaction.chargeback_rate || 0) * 100).toFixed(2)}%
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {transaction.description || '-'}
                      </TableCell>
                      <TableCell>
                        {transaction.fee_type || '-'}
                      </TableCell>
                      <TableCell className="max-w-xs truncate">
                        {transaction.fee_description || '-'}
                      </TableCell>
                      <TableCell>
                        {transaction.marketplace_name || '-'}
                      </TableCell>
                      <TableCell>
                        {transaction.currency_code}
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {transaction.amazon_account_id.slice(0, 8)}...
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </ScrollArea>

          {amazonTransactions.length === 0 && (
            <div className="text-center py-12">
              <p className="text-muted-foreground">No transactions found</p>
            </div>
          )}
        </CardContent>
      </Card>

      {amazonTransactions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Raw Data Sample</CardTitle>
            <p className="text-sm text-muted-foreground">
              First transaction raw data from Amazon
            </p>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-96">
              <pre className="text-xs bg-muted p-4 rounded">
                {JSON.stringify(amazonTransactions[0], null, 2)}
              </pre>
            </ScrollArea>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AmazonTransactionsTest;
