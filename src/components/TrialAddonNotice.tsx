import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { useTrialAddonUsage } from "@/hooks/useTrialAddonUsage";
import { Info, DollarSign } from "lucide-react";

interface TrialAddonNoticeProps {
  trialEnd?: string;
}

export function TrialAddonNotice({ trialEnd }: TrialAddonNoticeProps) {
  const { calculatePostTrialCost, getUsageBreakdown } = useTrialAddonUsage();
  
  const breakdown = getUsageBreakdown();
  const totalCost = calculatePostTrialCost();
  
  if (breakdown.length === 0) {
    return null;
  }

  return (
    <Card className="border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/20">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-blue-900 dark:text-blue-100">
              <Info className="h-5 w-5" />
              Add-on Usage During Trial
            </CardTitle>
            <CardDescription className="text-blue-700 dark:text-blue-300">
              You're using additional resources beyond your plan limits
            </CardDescription>
          </div>
          <Badge variant="secondary" className="bg-blue-100 dark:bg-blue-900">
            Trial Period
          </Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <Alert className="border-blue-300 dark:border-blue-700">
          <DollarSign className="h-4 w-4" />
          <AlertDescription className="text-sm">
            During your trial, you can use unlimited resources. After your trial ends
            {trialEnd && ` on ${new Date(trialEnd).toLocaleDateString()}`}, 
            you'll be charged for the additional usage below.
          </AlertDescription>
        </Alert>

        <div className="space-y-3">
          <h4 className="font-semibold text-sm text-blue-900 dark:text-blue-100">
            What you'll be charged after trial:
          </h4>
          
          {breakdown.map((item) => (
            <div 
              key={item.type} 
              className="flex items-center justify-between p-3 rounded-lg bg-white dark:bg-gray-900 border border-blue-200 dark:border-blue-800"
            >
              <div className="flex-1">
                <p className="font-medium text-sm">{item.name}</p>
                <p className="text-xs text-muted-foreground">
                  {item.quantity} × ${item.unitPrice}/month
                </p>
              </div>
              <div className="text-right">
                <p className="font-bold text-blue-600 dark:text-blue-400">
                  ${item.totalPrice}/mo
                </p>
              </div>
            </div>
          ))}

          <div className="pt-3 border-t border-blue-200 dark:border-blue-700">
            <div className="flex items-center justify-between">
              <span className="font-semibold text-blue-900 dark:text-blue-100">
                Total Additional Cost:
              </span>
              <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
                ${totalCost}/month
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Will be added to your subscription when trial ends
            </p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}