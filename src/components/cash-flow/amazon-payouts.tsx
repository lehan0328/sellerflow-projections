import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { ShoppingCart, TrendingUp, Calendar, Settings, RefreshCw, Sparkles } from "lucide-react";
import { useAmazonPayouts } from "@/hooks/useAmazonPayouts";
import { useAmazonAccounts } from "@/hooks/useAmazonAccounts";
import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
export function AmazonPayouts() {
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
  const [isGeneratingForecasts, setIsGeneratingForecasts] = useState(false);
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
  const handleGenerateForecasts = async () => {
    setIsGeneratingForecasts(true);
    try {
      const {
        data,
        error
      } = await supabase.functions.invoke('forecast-amazon-payouts');
      if (error) throw error;
      toast.success('AI forecasts generated successfully!');
      await refetch();
    } catch (error) {
      console.error('Error generating forecasts:', error);
      toast.error('Failed to generate AI forecasts');
    } finally {
      setIsGeneratingForecasts(false);
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
            
            <Button variant="outline" size="sm" onClick={handleGenerateForecasts} disabled={isGeneratingForecasts || amazonAccounts.length === 0}>
              <Sparkles className={`h-4 w-4 mr-2 ${isGeneratingForecasts ? 'animate-spin' : ''}`} />
              {isGeneratingForecasts ? 'Generating...' : 'Generate Forecasts'}
            </Button>
            <Button variant="outline" size="sm" onClick={() => window.location.href = '/settings'}>
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
        {amazonPayouts.length === 0 ? <div className="text-center py-8">
            <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold text-foreground mb-2">No Amazon payouts found</h3>
            <p className="text-muted-foreground mb-4">
              {amazonAccounts.length === 0 ? "Connect your Amazon seller account to see payouts" : "Sync your Amazon accounts to load payout data"}
            </p>
            <Button onClick={() => window.location.href = '/settings'}>
              <Settings className="h-4 w-4 mr-2" />
              {amazonAccounts.length === 0 ? "Connect Amazon Account" : "Manage Amazon Settings"}
            </Button>
          </div> : amazonPayouts.filter(payout => showForecasts ? true : payout.status !== 'forecasted').map(payout => {
        const daysUntil = getDaysUntil(payout.payout_date);
        const isUpcoming = daysUntil <= 7;
        const isForecasted = payout.status === 'forecasted';
        const confidence = isForecasted ? payout.raw_settlement_data?.forecast_metadata?.confidence : null;
        const riskLevel = isForecasted ? payout.raw_settlement_data?.forecast_metadata?.risk_level : null;
        
        return <div key={payout.id} className={`rounded-lg border bg-gradient-card p-4 transition-all hover:shadow-card ${isForecasted ? 'border-purple-500/30 bg-purple-500/5' : isUpcoming ? 'border-primary/30 bg-primary/5' : ''}`}>
                <div className="flex items-center justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      {isForecasted && <Badge variant="outline" className="text-xs bg-purple-500/10 text-purple-600 border-purple-500/30">
                          <Sparkles className="h-3 w-3 mr-1" />
                          AI Forecast
                        </Badge>}
                      {isForecasted && confidence && <Badge variant="secondary" className="text-xs">
                          {(confidence * 100).toFixed(0)}% confidence
                        </Badge>}
                      {isForecasted && riskLevel && <Badge variant="outline" className="text-xs capitalize">
                          {riskLevel.replace('_', ' ')}
                        </Badge>}
                      <Badge variant={getStatusColor(payout.status)} className="text-xs">
                        {payout.status}
                      </Badge>
                      <Badge variant={getTypeColor(payout.payout_type)} className="text-xs">
                        {payout.payout_type.replace("-", " ")}
                      </Badge>
                      <span className="text-xs text-muted-foreground">
                        {payout.marketplace_name}
                      </span>
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <Calendar className="mr-1 h-3 w-3" />
                        {formatDate(payout.payout_date)}
                      </span>
                      <span className={`font-medium ${daysUntil <= 0 ? 'text-finance-positive' : daysUntil <= 3 ? 'text-warning' : 'text-muted-foreground'}`}>
                        {daysUntil <= 0 ? 'Today' : daysUntil < 0 ? `${Math.abs(daysUntil)} days ago` : `in ${daysUntil} days`}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {payout.transaction_count} transactions
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-lg text-finance-positive">
                      {formatCurrency(payout.total_amount)}
                    </p>
                    {isUpcoming && <div className="flex items-center text-xs text-primary">
                        <TrendingUp className="mr-1 h-3 w-3" />
                        Upcoming
                      </div>}
                  </div>
                </div>
              </div>;
      })}
        {amazonPayouts.length > 0 && <div className="pt-2">
            <Button variant="outline" className="w-full" onClick={() => window.location.href = '/settings'}>
              View Amazon Settings & Full Schedule
            </Button>
          </div>}
      </CardContent>
    </Card>;
}