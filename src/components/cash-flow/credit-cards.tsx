import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { CreditCard, Calendar, AlertTriangle } from "lucide-react";

interface CreditCardAccount {
  id: string;
  name: string;
  accountNumber: string;
  balance: number;
  limit: number;
  availableCredit: number;
  priority: number;
  paymentDue: string;
  statementClose: string;
}

export const creditCards: CreditCardAccount[] = [
  {
    id: "1",
    name: "Bank of America CORP Account - Business Adv Unlimited Cash Rewards",
    accountNumber: "2678",
    balance: 1893.22,
    limit: 4500.00,
    availableCredit: 2606.78,
    priority: 1,
    paymentDue: "4th of the month",
    statementClose: "8th of the month",
  },
  {
    id: "2",
    name: "American Express Blue Business Plus Card",
    accountNumber: "6008",
    balance: 13049.91,
    limit: 13000.00,
    availableCredit: -49.91,
    priority: 1,
    paymentDue: "7th of the month",
    statementClose: "13th of the month",
  },
  {
    id: "3",
    name: "American Express Business Gold Card",
    accountNumber: "1002",
    balance: 7098.73,
    limit: 4200.00,
    availableCredit: 0,
    priority: 2,
    paymentDue: "12th of the month",
    statementClose: "14th of the month",
  },
];

export function CreditCards() {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
    }).format(amount);
  };

  const getUtilizationPercentage = (balance: number, limit: number) => {
    return Math.min((balance / limit) * 100, 100);
  };

  const getUtilizationVariant = (percentage: number) => {
    if (percentage >= 90) return "destructive";
    if (percentage >= 70) return "secondary";
    return "default";
  };

  const getPriorityColor = (priority: number) => {
    switch (priority) {
      case 1:
        return "destructive";
      case 2:
        return "secondary";
      default:
        return "default";
    }
  };

  // Export function to get credit card due date events
  const getCreditCardDueDates = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = new Date().getMonth();
    const events = [];

    creditCards.forEach(card => {
      // Parse payment due day from string like "4th of the month"
      const dayMatch = card.paymentDue.match(/(\d+)/);
      if (dayMatch) {
        const dueDay = parseInt(dayMatch[1]);
        
        // Calculate realistic minimum payment (2.5% of balance or $25, whichever is higher)
        const baseMinPayment = Math.max(card.balance * 0.025, 25);
        
        // Add events for next 6 months with varying amounts
        for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
          const dueDate = new Date(currentYear, currentMonth + monthOffset, dueDay);
          
          // Add some realistic monthly variation to minimum payments
          const variationFactor = 0.8 + (Math.sin(monthOffset * 0.5) * 0.3); // Varies between 0.8x to 1.1x
          const monthlyPayment = Math.round(baseMinPayment * variationFactor);
          
          // Occasionally make larger payments (25% chance)
          const isLargerPayment = Math.random() < 0.25;
          const finalPayment = isLargerPayment 
            ? Math.round(monthlyPayment * (2 + Math.random())) // 2x to 3x larger payment
            : monthlyPayment;

          events.push({
            id: `cc-due-${card.id}-${monthOffset}`,
            type: 'credit-payment' as const,
            amount: finalPayment,
            description: `${card.name.split(' ')[0]} ${card.name.split(' ')[1] || 'Card'} Min Payment`,
            creditCard: card.name,
            date: dueDate
          });
        }
      }
    });

    return events;
  };

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CreditCard className="h-5 w-5 text-primary" />
            <CardTitle>Credit Cards</CardTitle>
          </div>
          <div className="text-sm text-muted-foreground">
            Total Available: <span className="font-semibold text-finance-positive">{formatCurrency(creditCards.reduce((sum, card) => sum + Math.max(0, card.availableCredit), 0))}</span>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {creditCards.map((card) => {
          const utilizationPercentage = getUtilizationPercentage(card.balance, card.limit);
          const isOverLimit = card.availableCredit < 0;
          
          return (
            <div
              key={card.id}
              className="rounded-lg border bg-gradient-card p-4 transition-all hover:shadow-card"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center space-x-2">
                      <h4 className="font-semibold text-sm leading-tight">
                        {card.name}
                      </h4>
                      <Badge variant="outline" className="text-xs">
                        {card.accountNumber}
                      </Badge>
                      {card.priority && (
                        <Badge variant={getPriorityColor(card.priority)} className="text-xs">
                          Priority {card.priority}
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center space-x-4 text-sm text-muted-foreground">
                      <span className="flex items-center">
                        <Calendar className="mr-1 h-3 w-3" />
                        Due: {card.paymentDue}
                      </span>
                    </div>
                  </div>
                  {isOverLimit && (
                    <AlertTriangle className="h-5 w-5 text-destructive" />
                  )}
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-sm font-medium">Utilization</span>
                    <span className="text-sm text-muted-foreground">
                      {utilizationPercentage.toFixed(1)}%
                    </span>
                  </div>
                  <Progress 
                    value={utilizationPercentage} 
                    className="h-2"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <p className="text-muted-foreground">Balance</p>
                    <p className="font-semibold text-finance-negative">
                      {formatCurrency(card.balance)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Limit</p>
                    <p className="font-semibold">
                      {formatCurrency(card.limit)}
                    </p>
                  </div>
                  <div>
                    <p className="text-muted-foreground">Available</p>
                    <p className={`font-semibold ${
                      card.availableCredit < 0 ? 'text-finance-negative' : 'text-finance-positive'
                    }`}>
                      {formatCurrency(card.availableCredit)}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </CardContent>
    </Card>
  );
}

// Export the credit card due date events generator
export const getCreditCardDueDates = () => {
  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth();
  const events = [];

  creditCards.forEach(card => {
    // Parse payment due day from string like "4th of the month"
    const dayMatch = card.paymentDue.match(/(\d+)/);
    if (dayMatch) {
      const dueDay = parseInt(dayMatch[1]);
      
      // Calculate realistic minimum payment (2.5% of balance or $25, whichever is higher)
      const baseMinPayment = Math.max(card.balance * 0.025, 25);
      
      // Add events for next 6 months with varying amounts
      for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
        const dueDate = new Date(currentYear, currentMonth + monthOffset, dueDay);
        
        // Add some realistic monthly variation to minimum payments
        const variationFactor = 0.8 + (Math.sin(monthOffset * 0.5) * 0.3); // Varies between 0.8x to 1.1x
        const monthlyPayment = Math.round(baseMinPayment * variationFactor);
        
        // Occasionally make larger payments (25% chance)
        const isLargerPayment = Math.random() < 0.25;
        const finalPayment = isLargerPayment 
          ? Math.round(monthlyPayment * (2 + Math.random())) // 2x to 3x larger payment
          : monthlyPayment;

        events.push({
          id: `cc-due-${card.id}-${monthOffset}`,
          type: 'credit-payment' as const,
          amount: finalPayment,
          description: `${card.name.split(' ')[0]} ${card.name.split(' ')[1] || 'Card'} Min Payment`,
          creditCard: card.name,
          date: dueDate
        });
        
        // Debug log to verify correct date and amount calculation
        console.log(`Credit Card Payment: ${card.name.split(' ')[0]} due ${dueDate.toDateString()} - $${finalPayment}`);
      }
    }
  });

  console.log(`Generated ${events.length} credit card payment events for next 6 months`);
  return events;
};