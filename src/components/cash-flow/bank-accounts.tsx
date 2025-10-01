import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MoreVertical, Settings } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useBankAccounts } from "@/hooks/useBankAccounts";

export function BankAccounts() {
  const navigate = useNavigate();
  const { accounts, isLoading, totalBalance } = useBankAccounts();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getBalanceVariant = (balance: number) => {
    if (balance > 10000) return "default";
    if (balance > 1000) return "secondary";
    return "destructive";
  };

  if (isLoading) {
    return (
      <Card className="shadow-card">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
            <p className="text-muted-foreground ml-2">Loading accounts...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Bank Accounts</CardTitle>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/settings')}
              className="ml-4"
            >
              <Settings className="h-4 w-4 mr-2" />
              Manage
            </Button>
            {accounts.length > 0 && (
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => navigate('/transactions')}
              >
                View Transactions
              </Button>
            )}
          </div>
          <div className="text-right">
            <p className="text-sm text-muted-foreground">Total Balance</p>
            <p className="text-xl font-bold text-primary">
              {formatCurrency(totalBalance)}
            </p>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {accounts.length === 0 ? (
          <div className="text-center py-8">
            <Building2 className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
            <p className="text-muted-foreground">No bank accounts connected</p>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => navigate('/settings')}
              className="mt-2"
            >
              Connect Your First Account
            </Button>
          </div>
        ) : (
          accounts.map((account) => (
            <div
              key={account.id}
              className="flex items-center justify-between rounded-lg border bg-gradient-card p-4 transition-all hover:shadow-card"
            >
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <h4 className="font-semibold">{account.account_name}</h4>
                  <Badge variant="outline" className="text-xs">
                    {account.account_number}
                  </Badge>
                </div>
                <p className="text-sm text-muted-foreground">
                  Last sync: {new Date(account.last_sync).toLocaleString()}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <div className="text-right">
                  <p className="font-bold text-lg">
                    {formatCurrency(account.balance)}
                  </p>
                  <Badge variant={getBalanceVariant(account.balance)} className="text-xs">
                    {account.account_type}
                  </Badge>
                </div>
                <Button variant="ghost" size="sm">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}