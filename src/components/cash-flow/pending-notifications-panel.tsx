import { useState } from "react";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { format, isBefore, startOfDay } from "date-fns";

interface Vendor {
  id: string;
  name: string;
  totalOwed: number;
  nextPaymentDate: Date;
  nextPaymentAmount: number;
  status: string;
  poName?: string;
}

interface IncomeItem {
  id: string;
  amount: number;
  paymentDate: Date;
  status: 'received' | 'pending' | 'overdue';
  description: string;
  source: string;
}

interface PendingNotificationsPanelProps {
  vendors: Vendor[];
  incomeItems: IncomeItem[];
  onVendorClick?: (vendor: Vendor) => void;
  onIncomeClick?: (income: IncomeItem) => void;
}

export const PendingNotificationsPanel = ({
  vendors,
  incomeItems,
  onVendorClick,
  onIncomeClick,
}: PendingNotificationsPanelProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const today = startOfDay(new Date());

  // Get pending POs (past vendor payments not marked as paid)
  const pendingPOs = vendors.filter(vendor => {
    if (vendor.status === 'paid' || vendor.totalOwed <= 0) return false;
    const paymentDate = startOfDay(new Date(vendor.nextPaymentDate));
    return isBefore(paymentDate, today);
  });

  // Get pending income (past income not yet received)
  const pendingIncome = incomeItems.filter(income => {
    if (income.status === 'received') return false;
    const paymentDate = startOfDay(new Date(income.paymentDate));
    return isBefore(paymentDate, today);
  });

  const totalPending = pendingPOs.length + pendingIncome.length;

  return (
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        <Button variant="outline" size="sm" className="relative">
          <Bell className="h-4 w-4" />
          {totalPending > 0 && (
            <Badge 
              variant="destructive" 
              className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 flex items-center justify-center text-[10px]"
            >
              {totalPending}
            </Badge>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Pending Transactions</SheetTitle>
          <SheetDescription>
            Review and manage your pending purchase orders and income
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Pending POs Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Pending Purchase Orders</h3>
              <Badge variant="secondary">{pendingPOs.length}</Badge>
            </div>
            
            {pendingPOs.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending purchase orders</p>
            ) : (
              <div className="space-y-2">
                {pendingPOs.map(vendor => (
                  <div
                    key={vendor.id}
                    className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      onVendorClick?.(vendor);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{vendor.name}</p>
                        {vendor.poName && (
                          <p className="text-xs text-muted-foreground">{vendor.poName}</p>
                        )}
                        <p className="text-xs text-muted-foreground mt-1">
                          Due: {format(new Date(vendor.nextPaymentDate), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm text-finance-negative">
                          -${vendor.nextPaymentAmount.toLocaleString()}
                        </p>
                        <Badge variant="destructive" className="text-[10px] mt-1">
                          {Math.abs(Math.floor((today.getTime() - new Date(vendor.nextPaymentDate).getTime()) / (1000 * 60 * 60 * 24)))} days overdue
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pending Income Section */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-sm">Pending Income</h3>
              <Badge variant="secondary">{pendingIncome.length}</Badge>
            </div>
            
            {pendingIncome.length === 0 ? (
              <p className="text-sm text-muted-foreground">No pending income</p>
            ) : (
              <div className="space-y-2">
                {pendingIncome.map(income => (
                  <div
                    key={income.id}
                    className="border rounded-lg p-3 hover:bg-muted/50 transition-colors cursor-pointer"
                    onClick={() => {
                      onIncomeClick?.(income);
                      setIsOpen(false);
                    }}
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <p className="font-medium text-sm">{income.description}</p>
                        <p className="text-xs text-muted-foreground">{income.source}</p>
                        <p className="text-xs text-muted-foreground mt-1">
                          Expected: {format(new Date(income.paymentDate), 'MMM dd, yyyy')}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-sm text-finance-positive">
                          +${income.amount.toLocaleString()}
                        </p>
                        <Badge variant="destructive" className="text-[10px] mt-1">
                          {Math.abs(Math.floor((today.getTime() - new Date(income.paymentDate).getTime()) / (1000 * 60 * 60 * 24)))} days overdue
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
