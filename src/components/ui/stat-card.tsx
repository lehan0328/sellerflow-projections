import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statCardVariants = cva(
  "relative overflow-hidden rounded-lg border bg-gradient-card p-6 shadow-card transition-all duration-300 hover:shadow-elevated",
  {
    variants: {
      variant: {
        default: "border-border",
        positive: "border-success/20 bg-gradient-to-br from-success/5 to-success/10",
        negative: "border-destructive/20 bg-gradient-to-br from-destructive/5 to-destructive/10",
        warning: "border-warning/20 bg-gradient-to-br from-warning/5 to-warning/10",
        primary: "border-primary/20 bg-gradient-primary text-primary-foreground",
        accent: "border-accent/20 bg-gradient-accent text-accent-foreground",
      },
      size: {
        default: "p-6",
        sm: "p-4",
        lg: "p-8",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface StatCardProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof statCardVariants> {
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: "up" | "down" | "neutral";
  trendValue?: string;
  icon?: React.ReactNode;
}

const StatCard = React.forwardRef<HTMLDivElement, StatCardProps>(
  ({ className, variant, size, title, value, subtitle, trend, trendValue, icon, ...props }, ref) => {
    const getTrendColor = () => {
      switch (trend) {
        case "up":
          return "text-finance-positive";
        case "down":
          return "text-finance-negative";
        default:
          return "text-finance-neutral";
      }
    };

    return (
      <div
        className={cn(statCardVariants({ variant, size, className }))}
        ref={ref}
        {...props}
      >
        <div className="flex items-start justify-between">
          <div className="space-y-2">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-bold">{value}</p>
            {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
            {trend && trendValue && (
              <div className={cn("flex items-center space-x-2 text-sm font-medium", getTrendColor())}>
                <span>{trendValue}</span>
              </div>
            )}
          </div>
          {icon && (
            <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-primary/10">
              {icon}
            </div>
          )}
        </div>
      </div>
    );
  }
);

StatCard.displayName = "StatCard";

export { StatCard, statCardVariants };