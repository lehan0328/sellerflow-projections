import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Building2, Calendar, DollarSign, AlertTriangle, Plus } from "lucide-react";

interface Vendor {
  id: string;
  name: string;
  totalOwed: number;
  nextPaymentDate: Date;
  nextPaymentAmount: number;
  status: 'current' | 'overdue' | 'upcoming';
  category: string;
}

interface VendorsOverviewProps {
  onAddVendor: () => void;
}

export const VendorsOverview = ({ onAddVendor }: VendorsOverviewProps) => {
  const vendors: Vendor[] = [
    {
      id: '1',
      name: 'Global Vendor Co.',
      totalOwed: 28500,
      nextPaymentDate: new Date(2024, 0, 18),
      nextPaymentAmount: 8500,
      status: 'upcoming',
      category: 'Inventory'
    },
    {
      id: '2',
      name: 'Amazon Advertising',
      totalOwed: 3200,
      nextPaymentDate: new Date(2024, 0, 25),
      nextPaymentAmount: 3200,
      status: 'current',
      category: 'Marketing'
    },
    {
      id: '3',
      name: 'Packaging Solutions Inc.',
      totalOwed: 5400,
      nextPaymentDate: new Date(2024, 0, 12),
      nextPaymentAmount: 2700,
      status: 'overdue',
      category: 'Packaging'
    },
    {
      id: '4',
      name: 'Logistics Partners',
      totalOwed: 1800,
      nextPaymentDate: new Date(2024, 0, 28),
      nextPaymentAmount: 1800,
      status: 'upcoming',
      category: 'Shipping'
    }
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'overdue':
        return 'destructive';
      case 'upcoming':
        return 'default';
      case 'current':
        return 'secondary';
      default:
        return 'secondary';
    }
  };

  const getStatusIcon = (status: string) => {
    if (status === 'overdue') {
      return <AlertTriangle className="h-4 w-4" />;
    }
    return <Calendar className="h-4 w-4" />;
  };

  const totalOwed = vendors.reduce((sum, vendor) => sum + vendor.totalOwed, 0);
  const overdueAmount = vendors
    .filter(v => v.status === 'overdue')
    .reduce((sum, vendor) => sum + vendor.totalOwed, 0);

  return (
    <Card className="shadow-card">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <CardTitle className="text-lg flex items-center space-x-2">
              <Building2 className="h-5 w-5" />
              <span>Vendors Overview</span>
            </CardTitle>
            <div className="flex items-center space-x-4 text-sm">
            <div className="flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-muted-foreground" />
              <span className="text-muted-foreground">Total Owed:</span>
              <span className="font-semibold">${totalOwed.toLocaleString()}</span>
            </div>
            {overdueAmount > 0 && (
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-destructive" />
                <span className="text-destructive font-semibold">
                  ${overdueAmount.toLocaleString()} Overdue
                </span>
              </div>
            )}
            </div>
          </div>
          <Button size="sm" onClick={onAddVendor} className="bg-gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Vendor
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
            >
              <div className="flex-1">
                <div className="flex items-center space-x-3 mb-2">
                  <h4 className="font-semibold">{vendor.name}</h4>
                  <Badge variant="outline" className="text-xs">
                    {vendor.category}
                  </Badge>
                  <Badge variant={getStatusColor(vendor.status)} className="text-xs">
                    {getStatusIcon(vendor.status)}
                    <span className="ml-1 capitalize">{vendor.status}</span>
                  </Badge>
                </div>
                <div className="flex items-center space-x-6 text-sm text-muted-foreground">
                  <span>
                    Total Owed: <span className="font-medium text-foreground">
                      ${vendor.totalOwed.toLocaleString()}
                    </span>
                  </span>
                  <span>
                    Next Payment: <span className="font-medium text-foreground">
                      ${vendor.nextPaymentAmount.toLocaleString()}
                    </span>
                  </span>
                  <span>
                    Due: <span className="font-medium text-foreground">
                      {vendor.nextPaymentDate.toLocaleDateString()}
                    </span>
                  </span>
                </div>
              </div>
              <div className="flex items-center space-x-2">
                <Button variant="outline" size="sm">
                  Edit
                </Button>
                <Button size="sm" className="bg-gradient-primary">
                  Pay Now
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};