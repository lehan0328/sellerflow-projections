import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ShoppingCart, TrendingUp, Calendar } from "lucide-react";

interface AmazonPayout {
  id: string;
  amount: number;
  date: string;
  status: "confirmed" | "estimated" | "processing";
  marketplace: string;
  type: "bi-weekly" | "reserve-release" | "adjustment";
}

const payouts: AmazonPayout[] = [
  {
    id: "1",
    amount: 4250.00,
    date: "2025-09-25",
    status: "confirmed",
    marketplace: "US",
    type: "bi-weekly",
  },
  {
    id: "2",
    amount: 3850.00,
    date: "2025-10-09",
    status: "estimated",
    marketplace: "US",
    type: "bi-weekly",
  },
  {
    id: "3",
    amount: 1200.00,
    date: "2025-10-15",
    status: "estimated",
    marketplace: "US",
    type: "reserve-release",
  },
  {
    id: "4",
    amount: 4100.00,
    date: "2025-10-23",
    status: "estimated",
    marketplace: "US",
    type: "bi-weekly",
  },
];

export function AmazonPayouts() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const getDaysUntil = (dateString: string) => {
    const today = new Date();
    const payoutDate = new Date(dateString);
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

  const totalUpcoming = payouts.reduce((sum, payout) => sum + payout.amount, 0);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <ShoppingCart className="h-5 w-5 text-primary" />
            <CardTitle>Amazon Payouts</CardTitle>
          </div>
          <div className="text-sm text-muted-foreground">
            Expected: <span className="font-semibold text-finance-positive">
              {formatCurrency(totalUpcoming)}
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {payouts.map((payout) => {
          const daysUntil = getDaysUntil(payout.date);
          const isUpcoming = daysUntil <= 7;
          
          return (
            <div
              key={payout.id}
              className={`rounded-lg border bg-gradient-card p-4 transition-all hover:shadow-card ${
                isUpcoming ? 'border-primary/30 bg-primary/5' : ''
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <Badge variant={getStatusColor(payout.status)} className="text-xs">
                      {payout.status}
                    </Badge>
                    <Badge variant={getTypeColor(payout.type)} className="text-xs">
                      {payout.type.replace("-", " ")}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      {payout.marketplace}
                    </span>
                  </div>
                  <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                    <span className="flex items-center">
                      <Calendar className="mr-1 h-3 w-3" />
                      {formatDate(payout.date)}
                    </span>
                    <span className={`font-medium ${
                      daysUntil <= 0 ? 'text-finance-positive' : 
                      daysUntil <= 3 ? 'text-warning' : 'text-muted-foreground'
                    }`}>
                      {daysUntil <= 0 ? 'Today' : `${daysUntil} days`}
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-bold text-lg text-finance-positive">
                    {formatCurrency(payout.amount)}
                  </p>
                  {isUpcoming && (
                    <div className="flex items-center text-xs text-primary">
                      <TrendingUp className="mr-1 h-3 w-3" />
                      Upcoming
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
        <div className="pt-2">
          <Button variant="outline" className="w-full">
            View Full Payout Schedule
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}