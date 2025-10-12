import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { TrendingDown, TrendingUp, Search } from "lucide-react";
import { Input } from "@/components/ui/input";

interface BankTransaction {
  id: string;
  description: string;
  merchantName?: string;
  amount: number;
  date: Date;
  type: 'credit' | 'debit';
}

interface VendorTransaction {
  id: string;
  vendorName: string;
  description: string;
  amount: number;
  dueDate: Date;
  category?: string;
}

interface Income {
  id: string;
  description: string;
  source: string;
  amount: number;
  paymentDate: Date;
  status: string;
}

interface ManualMatchDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  transaction: BankTransaction | null;
  vendorTransactions?: VendorTransaction[];
  incomeItems?: Income[];
  onMatch: (matchId: string, matchType: 'income' | 'vendor') => Promise<void>;
}

export function ManualMatchDialog({
  open,
  onOpenChange,
  transaction,
  vendorTransactions = [],
  incomeItems = [],
  onMatch,
}: ManualMatchDialogProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [processing, setProcessing] = useState(false);

  if (!transaction) return null;

  const isDebit = transaction.type === 'debit' || transaction.amount < 0;
  const matchItems = isDebit ? vendorTransactions : incomeItems;

  const filteredItems = matchItems.filter((item) => {
    const searchString = 'vendorName' in item 
      ? `${item.vendorName} ${item.description}`.toLowerCase()
      : `${item.source} ${item.description}`.toLowerCase();
    return searchString.includes(searchTerm.toLowerCase());
  });

  const handleMatch = async (itemId: string) => {
    setProcessing(true);
    try {
      await onMatch(itemId, isDebit ? 'vendor' : 'income');
      onOpenChange(false);
      setSearchTerm("");
    } catch (error) {
      console.error('Failed to match:', error);
    } finally {
      setProcessing(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>Manual Match Transaction</DialogTitle>
          <DialogDescription>
            Select {isDebit ? 'a vendor' : 'an income item'} to match with this bank transaction
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Transaction Details */}
          <div className="p-4 bg-muted rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <p className="font-medium">{transaction.merchantName || transaction.description}</p>
                <p className="text-sm text-muted-foreground">{format(transaction.date, 'MMM dd, yyyy')}</p>
              </div>
              <div className="text-right">
                <p className="text-lg font-semibold">
                  {isDebit ? '-' : '+'}${Math.abs(transaction.amount).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
                <Badge variant={isDebit ? 'destructive' : 'default'}>
                  {isDebit ? 'Debit' : 'Credit'}
                </Badge>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder={`Search ${isDebit ? 'transactions' : 'income items'}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9"
            />
          </div>

          {/* Match Options */}
          <ScrollArea className="h-[300px] border rounded-lg">
            <div className="p-2 space-y-2">
              {filteredItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No {isDebit ? 'transactions' : 'income items'} found
                </div>
              ) : (
                filteredItems.map((item) => (
                  <button
                    key={item.id}
                    onClick={() => handleMatch(item.id)}
                    disabled={processing}
                    className="w-full p-4 text-left border rounded-lg hover:bg-accent transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-3 flex-1">
                        <div className={`p-2 rounded-full ${isDebit ? 'bg-red-100 dark:bg-red-900/20' : 'bg-green-100 dark:bg-green-900/20'}`}>
                          {isDebit ? (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          ) : (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          )}
                        </div>
                        <div className="flex-1">
                          <p className="font-medium">
                            {'vendorName' in item ? item.vendorName : item.source}
                          </p>
                          <p className="text-sm text-muted-foreground">{item.description}</p>
                          {'category' in item && item.category && (
                            <Badge variant="outline" className="mt-1 text-xs">
                              {item.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold">
                          ${item.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {format(
                            'dueDate' in item ? item.dueDate : item.paymentDate,
                            'MMM dd, yyyy'
                          )}
                        </p>
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={processing}>
            Cancel
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
