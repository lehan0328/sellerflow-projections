import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Settings, RefreshCw } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useState } from "react";

interface AmazonAccountConfigProps {
  account: {
    id: string;
    account_name: string;
    marketplace_name: string;
    payout_frequency: string;
    payout_model: string;
    sync_status: string;
    transaction_count: number;
  };
  onUpdate: () => void;
}

export function AmazonAccountConfig({ account, onUpdate }: AmazonAccountConfigProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [selectedModel, setSelectedModel] = useState(account.payout_model || 'bi-weekly');

  const handleUpdatePayoutModel = async () => {
    setIsUpdating(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        toast.error('Please log in to update settings');
        return;
      }

      const { error } = await supabase.functions.invoke('fix-amazon-account-settings', {
        body: { accountId: account.id, payoutModel: selectedModel },
        headers: {
          Authorization: `Bearer ${session.access_token}`,
        },
      });

      if (error) throw error;

      toast.success(`Updated ${account.account_name} to ${selectedModel} payouts`);
      onUpdate();
    } catch (error) {
      console.error('Failed to update account:', error);
      toast.error('Failed to update account settings');
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Settings className="h-5 w-5" />
            <span>{account.account_name}</span>
          </div>
          <Badge variant="outline">{account.marketplace_name}</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="payout-model">Payout Model</Label>
          <Select value={selectedModel} onValueChange={setSelectedModel}>
            <SelectTrigger id="payout-model">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily Payouts</SelectItem>
              <SelectItem value="bi-weekly">Bi-Weekly Payouts</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Current Status:</span>
          <Badge variant={account.sync_status === 'syncing' ? 'secondary' : 'outline'}>
            {account.sync_status}
          </Badge>
        </div>

        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">Transactions:</span>
          <span className="font-medium">{account.transaction_count?.toLocaleString() || 0}</span>
        </div>

        <Button 
          onClick={handleUpdatePayoutModel} 
          disabled={isUpdating || selectedModel === account.payout_model}
          className="w-full"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isUpdating ? 'animate-spin' : ''}`} />
          Update Settings
        </Button>
      </CardContent>
    </Card>
  );
}
