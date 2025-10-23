import { useAmazonTransactions } from "@/hooks/useAmazonTransactions";
import { useAmazonAccounts } from "@/hooks/useAmazonAccounts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Loader2, ArrowLeft, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ForecastExplainer } from "@/components/ForecastExplainer";
import { useEffect } from "react";

const AmazonTransactionsTest = () => {
  const { amazonTransactions, isLoading, refetch } = useAmazonTransactions();
  const { amazonAccounts } = useAmazonAccounts();
  const navigate = useNavigate();

  // Auto-refresh every 3 seconds while syncing
  useEffect(() => {
    const isSyncing = amazonAccounts.some(acc => acc.sync_status === 'syncing');
    if (isSyncing) {
      const interval = setInterval(() => {
        refetch();
      }, 3000);
      return () => clearInterval(interval);
    }
  }, [amazonAccounts, refetch]);

  const syncingAccount = amazonAccounts.find(acc => acc.sync_status === 'syncing');

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

      {syncingAccount && (
        <Card className="border-blue-500 bg-blue-50 dark:bg-blue-950">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <Loader2 className="h-6 w-6 animate-spin text-blue-600" />
              <div className="flex-1">
                <p className="font-semibold text-blue-900 dark:text-blue-100">
                  Syncing: {syncingAccount.account_name}
                </p>
                <p className="text-sm text-blue-700 dark:text-blue-300">
                  {syncingAccount.sync_message || 'Starting sync...'}
                </p>
                <div className="mt-2 bg-blue-200 dark:bg-blue-900 rounded-full h-2">
                  <div 
                    className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${syncingAccount.sync_progress || 0}%` }}
                  />
                </div>
              </div>
              <Button variant="ghost" size="sm" onClick={refetch}>
                <RefreshCw className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle>Why Some Data Shows Zeros</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="p-4 bg-yellow-50 dark:bg-yellow-950 border border-yellow-200 dark:border-yellow-800 rounded">
            <h4 className="font-semibold mb-2 text-yellow-900 dark:text-yellow-100">⚠️ Data Limitation from Amazon API</h4>
            <p className="text-sm text-yellow-800 dark:text-yellow-200 mb-2">
              The Amazon Financial Events API (ShipmentEventList, RefundEventList) doesn't provide detailed cost breakdowns for:
            </p>
            <ul className="text-sm text-yellow-800 dark:text-yellow-200 list-disc list-inside space-y-1">
              <li><strong>Shipping Costs</strong> - Not included in Financial Events API</li>
              <li><strong>Ad Costs (PPC)</strong> - Requires separate Advertising API integration</li>
              <li><strong>Return Rates</strong> - Requires historical analysis of Orders API data</li>
              <li><strong>Chargeback Rates</strong> - Not provided in real-time transaction data</li>
            </ul>
          </div>

          <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded">
            <h4 className="font-semibold mb-2 text-blue-900 dark:text-blue-100">📊 What We DO Get From Amazon</h4>
            <ul className="text-sm text-blue-800 dark:text-blue-200 list-disc list-inside space-y-1">
              <li><strong>Transaction Type</strong> - Order, Refund, Reimbursement, Service Fees, Adjustments</li>
              <li><strong>Gross Amount</strong> - Total revenue from the transaction</li>
              <li><strong>Net Amount</strong> - Amount after Amazon's fees are deducted</li>
              <li><strong>Order ID & SKU</strong> - Product and order identifiers</li>
              <li><strong>Transaction Date</strong> - When the event occurred</li>
              <li><strong>Delivery Date</strong> - Estimated or actual delivery (when available)</li>
            </ul>
          </div>

          <div className="p-4 bg-muted rounded">
            <h4 className="font-semibold mb-2">💡 How Forecasting Works Without This Data</h4>
            <p className="text-sm text-muted-foreground">
              The mathematical forecasting model uses the net amounts and transaction patterns we DO receive 
              to project future payouts. While additional cost data would improve accuracy, the core model 
              works with available data by analyzing historical payout patterns and settlement cycles.
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>
                Transaction Count: {amazonTransactions.length}
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Showing all available fields from Amazon SP-API (auto-refreshes during sync)
              </p>
            </div>
            <Button variant="outline" size="sm" onClick={refetch}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="h-[600px] w-full overflow-x-auto overflow-y-auto">
            <div className="min-w-[2000px]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Order ID</TableHead>
                    <TableHead>SKU</TableHead>
                    <TableHead>Gross Amount</TableHead>
                    <TableHead>Net Amount</TableHead>
                    <TableHead>Delivery Date</TableHead>
                    <TableHead>Fee Type</TableHead>
                    <TableHead>Fee Description</TableHead>
                    <TableHead>Marketplace</TableHead>
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
                      <TableCell className="whitespace-nowrap">
                        {transaction.delivery_date ? new Date(transaction.delivery_date).toLocaleDateString() : '-'}
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
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>

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
