import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, MoreVertical } from "lucide-react";

interface BankAccount {
  id: string;
  name: string;
  accountNumber: string;
  balance: number;
  type: "depository" | "credit";
  lastSync: string;
}

const bankAccounts: BankAccount[] = [
  {
    id: "1",
    name: "Bank of America Imarand",
    accountNumber: "7034",
    balance: 14269.39,
    type: "depository",
    lastSync: "2025-09-23 12:08:20",
  },
  {
    id: "2",
    name: "Bluevine Imarand Distributions Inc",
    accountNumber: "7080",
    balance: 4.29,
    type: "depository",
    lastSync: "2025-09-23 12:07:57",
  },
];

export function BankAccounts() {
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

  const totalBalance = bankAccounts.reduce((sum, account) => sum + account.balance, 0);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Building2 className="h-5 w-5 text-primary" />
            <CardTitle>Bank Accounts</CardTitle>
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
        {bankAccounts.map((account) => (
          <div
            key={account.id}
            className="flex items-center justify-between rounded-lg border bg-gradient-card p-4 transition-all hover:shadow-card"
          >
            <div className="space-y-1">
              <div className="flex items-center space-x-2">
                <h4 className="font-semibold">{account.name}</h4>
                <Badge variant="outline" className="text-xs">
                  {account.accountNumber}
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground">
                Last sync: {new Date(account.lastSync).toLocaleString()}
              </p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="font-bold text-lg">
                  {formatCurrency(account.balance)}
                </p>
                <Badge variant={getBalanceVariant(account.balance)} className="text-xs">
                  {account.type}
                </Badge>
              </div>
              <Button variant="ghost" size="sm">
                <MoreVertical className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}