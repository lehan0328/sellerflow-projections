import { useAmazonTransactions } from "@/hooks/useAmazonTransactions";
import { useAmazonAccounts } from "@/hooks/useAmazonAccounts";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
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
  const { amazonPayouts, isLoading: payoutsLoading } = useAmazonPayouts();
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

  // Categorize transactions by type
  const transactionsByType = amazonTransactions.reduce((acc, txn) => {
    const type = txn.transaction_type || 'Unknown';
    if (!acc[type]) {
      acc[type] = [];
    }
    acc[type].push(txn);
    return acc;
  }, {} as Record<string, typeof amazonTransactions>);

  // Define transaction type colors and labels
  const transactionTypeInfo: Record<string, { color: string; label: string; description: string }> = {
    'Order': { color: 'bg-green-500', label: 'Order/Sale', description: 'Product sales revenue' },
    'Refund': { color: 'bg-red-500', label: 'Refund', description: 'Customer refunds' },
    'Reimbursement': { color: 'bg-blue-500', label: 'Reimbursement', description: 'Amazon reimbursements for lost/damaged' },
    'ServiceFee': { color: 'bg-purple-500', label: 'Service Fee', description: 'Amazon subscription & service fees' },
    'Adjustment': { color: 'bg-yellow-500', label: 'Adjustment', description: 'Manual adjustments & corrections' },
    'SAFETReimbursement': { color: 'bg-cyan-500', label: 'SAFE-T Claim', description: 'SAFE-T claim reimbursements' },
    'Chargeback': { color: 'bg-orange-500', label: 'Chargeback', description: 'Payment chargebacks' },
    'GuaranteeClaim': { color: 'bg-pink-500', label: 'A-to-z Claim', description: 'Amazon A-to-z guarantee claims' },
    'SponsoredAds': { color: 'bg-indigo-500', label: 'Sponsored Ads', description: 'Amazon PPC advertising costs' },
    'FBALiquidation': { color: 'bg-teal-500', label: 'FBA Liquidation', description: 'FBA liquidation proceeds' },
    'RemovalShipment': { color: 'bg-amber-500', label: 'Removal Fee', description: 'FBA removal shipment fees' },
    'CouponPayment': { color: 'bg-lime-500', label: 'Coupon', description: 'Coupon redemption payments' },
    'RentalTransaction': { color: 'bg-emerald-500', label: 'Rental', description: 'Rental transaction revenue' },
    'LoanServicing': { color: 'bg-violet-500', label: 'Loan', description: 'Amazon loan servicing' },
    'TaxWithholding': { color: 'bg-rose-500', label: 'Tax', description: 'Tax withholding events' },
  };

  const getTypeInfo = (type: string) => transactionTypeInfo[type] || { 
    color: 'bg-gray-500', 
    label: type, 
    description: 'Other transaction type' 
  };

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

      {/* Amazon Account Status & Sync Progress */}
      <Card>
        <CardHeader>
          <CardTitle>Amazon Account Status & Sync Progress</CardTitle>
        </CardHeader>
        <CardContent>
          {amazonAccounts.length === 0 ? (
            <p className="text-muted-foreground">No Amazon accounts connected</p>
          ) : (
            <div className="space-y-4">
              {amazonAccounts.map((account) => (
                <div key={account.id} className="p-4 border rounded-lg space-y-3">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h4 className="font-semibold">{account.account_name}</h4>
                      <p className="text-sm text-muted-foreground">{account.marketplace_name}</p>
                    </div>
                    <Badge variant={
                      account.sync_status === 'syncing' ? 'default' :
                      account.sync_status === 'error' ? 'destructive' :
                      account.initial_sync_complete ? 'outline' : 'secondary'
                    }>
                      {account.sync_status === 'syncing' ? 'Syncing' :
                       account.sync_status === 'error' ? 'Error' :
                       account.initial_sync_complete ? '✓ Synced' : 'Backfilling...'}
                    </Badge>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                    <div>
                      <p className="text-muted-foreground">Payout Frequency</p>
                      <p className="font-semibold capitalize">{account.payout_frequency}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Last Sync</p>
                      <p className="font-semibold">
                        {account.last_sync ? new Date(account.last_sync).toLocaleString() : 'Never'}
                      </p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Transactions</p>
                      <p className="font-semibold">{account.transaction_count || 0}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Backfill Complete</p>
                      <p className="font-semibold">{account.initial_sync_complete ? 'Yes' : 'No'}</p>
                    </div>
                  </div>

                  {account.sync_status === 'syncing' && (
                    <div>
                      <div className="flex items-center justify-between text-sm mb-1">
                        <span className="text-muted-foreground">
                          {account.sync_message || 'Starting sync...'}
                        </span>
                        <span className="font-semibold">{account.sync_progress || 0}%</span>
                      </div>
                      <div className="bg-muted rounded-full h-2">
                        <div 
                          className="bg-primary h-2 rounded-full transition-all duration-300"
                          style={{ width: `${account.sync_progress || 0}%` }}
                        />
                      </div>
                    </div>
                  )}

                  {account.last_sync_error && (
                    <div className="p-3 bg-destructive/10 border border-destructive/20 rounded text-sm text-destructive">
                      {account.last_sync_error}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Amazon Payouts Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Amazon Payouts</CardTitle>
          <p className="text-sm text-muted-foreground">
            Scheduled and forecasted payouts from Amazon
          </p>
        </CardHeader>
        <CardContent>
          {payoutsLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : amazonPayouts.length === 0 ? (
            <p className="text-muted-foreground">No payouts found</p>
          ) : (
            <div className="space-y-3">
              {amazonPayouts.slice(0, 10).map((payout) => (
                <div key={payout.id} className="p-4 border rounded-lg">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold">
                        {new Date(payout.payout_date).toLocaleDateString('en-US', { 
                          weekday: 'short', 
                          month: 'short', 
                          day: 'numeric', 
                          year: 'numeric' 
                        })}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {payout.amazon_accounts?.account_name || 'Unknown Account'}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-xl font-bold">
                        ${payout.total_amount.toFixed(2)}
                      </p>
                      <Badge variant={
                        payout.status === 'confirmed' ? 'default' :
                        payout.status === 'estimated' ? 'secondary' :
                        payout.status === 'forecasted' ? 'outline' : 'destructive'
                      }>
                        {payout.status}
                      </Badge>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm mt-3 pt-3 border-t">
                    <div>
                      <p className="text-muted-foreground">Type</p>
                      <p className="font-medium capitalize">{payout.payout_type.replace('-', ' ')}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Orders</p>
                      <p className="font-medium">${payout.orders_total?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Fees</p>
                      <p className="font-medium text-red-600">${payout.fees_total?.toFixed(2) || '0.00'}</p>
                    </div>
                    <div>
                      <p className="text-muted-foreground">Refunds</p>
                      <p className="font-medium text-red-600">${payout.refunds_total?.toFixed(2) || '0.00'}</p>
                    </div>
                  </div>
                </div>
              ))}
              {amazonPayouts.length > 10 && (
                <p className="text-sm text-muted-foreground text-center pt-2">
                  Showing 10 of {amazonPayouts.length} payouts
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

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

      {/* Transaction Type Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Amazon Financial Event Types Captured</CardTitle>
          <p className="text-sm text-muted-foreground">
            Breakdown by transaction type from Amazon SP-API Financial Events
          </p>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Object.entries(transactionsByType).map(([type, transactions]) => {
              const typeInfo = getTypeInfo(type);
              const totalAmount = transactions.reduce((sum, t) => sum + (t.amount || 0), 0);
              
              return (
                <div key={type} className="p-4 rounded-lg border bg-card hover:shadow-md transition-shadow">
                  <div className="flex items-start gap-3">
                    <div className={`w-3 h-3 rounded-full ${typeInfo.color} mt-1 flex-shrink-0`} />
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-sm">{typeInfo.label}</h4>
                      <p className="text-xs text-muted-foreground mb-2">{typeInfo.description}</p>
                      <div className="flex items-center justify-between">
                        <Badge variant="outline" className="text-xs">
                          {transactions.length} events
                        </Badge>
                        <span className={`text-sm font-semibold ${totalAmount >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${totalAmount.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>

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
                        <Badge 
                          variant={transaction.transaction_type === 'Order' ? 'default' : 'destructive'}
                          className={`${getTypeInfo(transaction.transaction_type).color} text-white border-0`}
                        >
                          {getTypeInfo(transaction.transaction_type).label}
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
