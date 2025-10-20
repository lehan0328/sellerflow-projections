import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ShoppingCart, TrendingUp, Calendar, Settings, RefreshCw, Sparkles, Clock, Trash2 } from "lucide-react";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { useAmazonAccounts } from "@/hooks/useAmazonAccounts";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
export function AmazonPayouts() {
  const navigate = useNavigate();
  const {
    amazonPayouts,
    isLoading,
    totalUpcoming,
    refetch
  } = useAmazonPayouts();
  const {
    amazonAccounts,
    syncAmazonAccount
  } = useAmazonAccounts();
  const [isSyncing, setIsSyncing] = useState<string | null>(null);
  const [showForecasts, setShowForecasts] = useState(true);
  const [deletingPayoutId, setDeletingPayoutId] = useState<string | null>(null);
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD"
    }).format(amount);
  };
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric"
    });
  };
  const getDaysUntil = (dateString: string) => {
    // Normalize both dates to midnight local time for accurate day calculation
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const payoutDate = new Date(dateString);
    payoutDate.setHours(0, 0, 0, 0);
    
    const diffTime = payoutDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };
  const getStatusColor = (status: string) => {
    switch (status) {
      case "confirmed":
        return "default";
      case "estimated":
        return "secondary";
      case "processing":
        return "outline";
      default:
        return "secondary";
    }
  };
  const getTypeColor = (type: string) => {
    switch (type) {
      case "bi-weekly":
        return "default";
      case "reserve-release":
        return "destructive";
      case "adjustment":
        return "secondary";
      default:
        return "default";
    }
  };
  const handleSyncAllAccounts = async () => {
    for (const account of amazonAccounts) {
      setIsSyncing(account.id);
      await syncAmazonAccount(account.id);
    }
    setIsSyncing(null);
  };

  const handleDeletePayout = async (payoutId: string) => {
    setDeletingPayoutId(payoutId);
    try {
      const { error } = await supabase
        .from('amazon_payouts')
        .delete()
        .eq('id', payoutId);

      if (error) throw error;

      toast.success("Payout deleted successfully");
      refetch();
    } catch (error) {
      console.error('Error deleting payout:', error);
      toast.error("Failed to delete payout");
    } finally {
      setDeletingPayoutId(null);
    }
  };
  if (isLoading) {
    return <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <span>Amazon Payouts</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">Loading Amazon payouts...</p>
        </CardContent>
      </Card>;
  }
  return <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <ShoppingCart className="h-5 w-5 text-primary" />
              <CardTitle>Amazon Payouts</CardTitle>
            </div>
            
            <Button variant="outline" size="sm" onClick={() => navigate('/settings')}>
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </Button>
          </div>
          <div className="flex items-center space-x-4">
            <div className="text-sm text-muted-foreground">
              Expected: <span className="font-semibold text-finance-positive">
                {formatCurrency(totalUpcoming)}
              </span>
            </div>
            {amazonAccounts.length > 0 && <>
                <div className="text-xs text-muted-foreground">
                  Last sync: {amazonAccounts[0]?.last_sync ? new Date(amazonAccounts[0].last_sync).toLocaleString('en-US', {
                month: 'short',
                day: 'numeric',
                hour: 'numeric',
                minute: '2-digit'
              }) : 'Never'}
                </div>
                <Button variant="outline" size="sm" onClick={handleSyncAllAccounts} disabled={isSyncing !== null}>
                  <RefreshCw className={`h-4 w-4 mr-2 ${isSyncing ? 'animate-spin' : ''}`} />
                  Sync
                </Button>
              </>}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {amazonPayouts.length === 0 ? <div className="space-y-4">
            {amazonAccounts.length > 0 && <Alert className="border-blue-500/30 bg-blue-500/5">
                <Clock className="h-4 w-4 text-blue-600" />
                <AlertDescription className="text-sm text-muted-foreground">
                  Amazon data sync can take up to 24 hours after connecting your account. Please check back later.
                </AlertDescription>
              </Alert>}
            <div className="text-center py-8">
              <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">No Amazon payouts found</h3>
              <p className="text-muted-foreground mb-4">
                {amazonAccounts.length === 0 ? "Connect your Amazon seller account to see payouts" : "Sync your Amazon accounts to load payout data"}
              </p>
              <Button onClick={() => navigate('/settings')}>
                <Settings className="h-4 w-4 mr-2" />
                {amazonAccounts.length === 0 ? "Connect Amazon Account" : "Manage Amazon Settings"}
              </Button>
            </div>
          </div> : (() => {
          // Group payouts by date and aggregate amounts
          const filteredPayouts = amazonPayouts.filter(payout => showForecasts ? true : payout.status !== 'forecasted');
          const payoutsByDate = filteredPayouts.reduce((acc, payout) => {
            const dateKey = payout.payout_date;
            if (!acc[dateKey]) {
              acc[dateKey] = {
                ...payout,
                total_amount: 0,
                transaction_count: 0,
                payouts: []
              };
            }
            acc[dateKey].total_amount += payout.total_amount;
            acc[dateKey].transaction_count += payout.transaction_count;
            acc[dateKey].payouts.push(payout);
            return acc;
          }, {} as Record<string, any>);
          
          return Object.values(payoutsByDate).map(aggregatedPayout => {
            const daysUntil = getDaysUntil(aggregatedPayout.payout_date);
            const isUpcoming = daysUntil <= 7;
            const isForecasted = aggregatedPayout.status === 'forecasted';
            
            return <div key={aggregatedPayout.payout_date} className={`rounded-lg border bg-gradient-card p-4 transition-all hover:shadow-card ${isUpcoming ? 'border-primary/30 bg-primary/5' : ''}`}>
                    <div className="flex items-center justify-between gap-2">
                      <div className="space-y-2 flex-1">
                        <div className="flex items-center space-x-2">
                          <Badge variant={getStatusColor(aggregatedPayout.status)} className="text-xs">
                            {aggregatedPayout.status}
                          </Badge>
                          <Badge variant={getTypeColor(aggregatedPayout.payout_type)} className="text-xs">
                            {aggregatedPayout.payout_type.replace("-", " ")}
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {aggregatedPayout.marketplace_name}
                          </span>
                          {aggregatedPayout.payouts.length > 1 && <Badge variant="secondary" className="text-xs">
                              {aggregatedPayout.payouts.length} accounts
                            </Badge>}
                        </div>
                        <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                          <span className="flex items-center">
                            <Calendar className="mr-1 h-3 w-3" />
                            {formatDate(aggregatedPayout.payout_date)}
                          </span>
                          <span className={`font-medium ${daysUntil <= 0 ? 'text-finance-positive' : daysUntil <= 3 ? 'text-warning' : 'text-muted-foreground'}`}>
                            {daysUntil <= 0 ? 'Today' : daysUntil < 0 ? `${Math.abs(daysUntil)} days ago` : `in ${daysUntil} days`}
                          </span>
                          <span className="text-xs text-muted-foreground">
                            {aggregatedPayout.transaction_count} transactions
                          </span>
                        </div>
                      </div>
                      <div className="text-right flex items-center gap-2">
                        <div>
                          <p className="font-bold text-lg text-finance-positive">
                            {formatCurrency(aggregatedPayout.total_amount)}
                          </p>
                          {isUpcoming && <div className="flex items-center text-xs text-primary">
                              <TrendingUp className="mr-1 h-3 w-3" />
                              Upcoming
                            </div>}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            // Delete all payouts for this date
                            aggregatedPayout.payouts.forEach((payout: any) => {
                              handleDeletePayout(payout.id);
                            });
                          }}
                          disabled={deletingPayoutId !== null}
                          className="h-8 w-8 p-0"
                        >
                          <Trash2 className="h-4 w-4 text-muted-foreground hover:text-destructive" />
                        </Button>
                      </div>
                    </div>
                  </div>;
          });
        })()}
        {amazonPayouts.length > 0 && <div className="pt-2">
            <Button variant="outline" className="w-full" onClick={() => navigate('/settings')}>
              View Amazon Settings & Full Schedule
            </Button>
          </div>}
      </CardContent>
    </Card>;
}
