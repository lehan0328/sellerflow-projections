import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { 
  RefreshCw, 
  CheckCircle, 
  XCircle, 
  AlertCircle, 
  ExternalLink,
  Trash2,
  Edit,
  Download,
  Play,
  Eye,
  Users
} from "lucide-react";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";

interface AuditResult {
  userId: string;
  email: string;
  dbCustomerId: string | null;
  stripeCustomerId: string | null;
  stripeEmail: string | null;
  status: 'valid' | 'invalid' | 'mismatch' | 'not_found' | 'multiple';
  canAutoFix: boolean;
  suggestedFix: string | null;
  amazonAccounts: number;
  bankAccounts: number;
  creditCards: number;
  forecasts: number;
}

interface AuditSummary {
  totalProfiles: number;
  validCustomers: number;
  invalidCustomers: number;
  mismatches: number;
  notFound: number;
  timestamp: string;
}

export function AdminStripeAudit() {
  const [isAuditing, setIsAuditing] = useState(false);
  const [isFixing, setIsFixing] = useState(false);
  const [auditResults, setAuditResults] = useState<AuditResult[]>([]);
  const [auditSummary, setAuditSummary] = useState<AuditSummary | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [progress, setProgress] = useState(0);
  const [selectedUser, setSelectedUser] = useState<AuditResult | null>(null);
  const [fixDialogOpen, setFixDialogOpen] = useState(false);
  const [fixAction, setFixAction] = useState<'update' | 'clear' | 'create'>('update');
  const [newCustomerId, setNewCustomerId] = useState("");
  const [autoFixDialogOpen, setAutoFixDialogOpen] = useState(false);
  const [autoFixPreview, setAutoFixPreview] = useState<any>(null);

  const runAudit = async () => {
    setIsAuditing(true);
    setProgress(10);
    
    try {
      const { data, error } = await supabase.functions.invoke('audit-stripe-customers', {
        body: {},
      });

      setProgress(80);

      if (error) throw error;

      if (data.success) {
        setAuditSummary(data.summary);
        setAuditResults(data.results);
        setProgress(100);
        toast.success(`Audit completed: ${data.summary.totalProfiles} profiles analyzed`);
      } else {
        throw new Error(data.error || 'Audit failed');
      }
    } catch (error: any) {
      console.error('Audit error:', error);
      toast.error(`Audit failed: ${error.message}`);
    } finally {
      setIsAuditing(false);
      setTimeout(() => setProgress(0), 1000);
    }
  };

  const runAutoFix = async (dryRun: boolean = true) => {
    setIsFixing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('auto-fix-stripe-mismatches', {
        body: { dryRun },
      });

      if (error) throw error;

      if (data.success) {
        if (dryRun) {
          setAutoFixPreview(data);
          setAutoFixDialogOpen(true);
          toast.info(`Preview: ${data.summary.fixed} issues can be auto-fixed`);
        } else {
          toast.success(`Auto-fix completed: ${data.summary.fixed} issues fixed`);
          setAutoFixDialogOpen(false);
          // Refresh audit
          await runAudit();
        }
      } else {
        throw new Error(data.error || 'Auto-fix failed');
      }
    } catch (error: any) {
      console.error('Auto-fix error:', error);
      toast.error(`Auto-fix failed: ${error.message}`);
    } finally {
      setIsFixing(false);
    }
  };

  const fixSingleUser = async () => {
    if (!selectedUser) return;

    setIsFixing(true);
    
    try {
      const { data, error } = await supabase.functions.invoke('fix-stripe-customer-id', {
        body: {
          userId: selectedUser.userId,
          customerId: fixAction === 'update' ? newCustomerId : null,
          action: fixAction,
          reason: `Manual fix by admin: ${fixAction}`,
        },
      });

      if (error) throw error;

      if (data.success) {
        toast.success(`Successfully ${fixAction}d customer ID for ${selectedUser.email}`);
        setFixDialogOpen(false);
        setSelectedUser(null);
        setNewCustomerId("");
        // Refresh audit
        await runAudit();
      } else {
        throw new Error(data.error || 'Fix failed');
      }
    } catch (error: any) {
      console.error('Fix error:', error);
      toast.error(`Fix failed: ${error.message}`);
    } finally {
      setIsFixing(false);
    }
  };

  const openFixDialog = (result: AuditResult) => {
    setSelectedUser(result);
    if (result.stripeCustomerId && result.status !== 'valid') {
      setFixAction('update');
      setNewCustomerId(result.stripeCustomerId);
    } else if (result.dbCustomerId && result.status === 'invalid') {
      setFixAction('clear');
    } else {
      setFixAction('create');
    }
    setFixDialogOpen(true);
  };

  const exportToCSV = () => {
    if (!auditResults.length) {
      toast.error('No audit results to export');
      return;
    }

    const headers = ['Email', 'Database Customer ID', 'Stripe Customer ID', 'Status', 'Stripe Email', 'Amazon Accounts', 'Bank Accounts', 'Credit Cards', 'Forecasts', 'Can Auto-Fix', 'Suggested Action'];
    const rows = auditResults.map(r => [
      r.email,
      r.dbCustomerId || 'N/A',
      r.stripeCustomerId || 'N/A',
      r.status,
      r.stripeEmail || 'N/A',
      r.amazonAccounts || 0,
      r.bankAccounts || 0,
      r.creditCards || 0,
      r.forecasts || 0,
      r.canAutoFix ? 'Yes' : 'No',
      r.suggestedFix || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `stripe-audit-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
    toast.success('Audit results exported to CSV');
  };

  const filteredResults = auditResults.filter(result => {
    const matchesSearch = result.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.dbCustomerId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         result.stripeCustomerId?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = statusFilter === 'all' || result.status === statusFilter;
    
    return matchesSearch && matchesFilter;
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'valid':
        return <Badge variant="default" className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" />Valid</Badge>;
      case 'invalid':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" />Invalid</Badge>;
      case 'mismatch':
        return <Badge variant="default" className="bg-yellow-500"><AlertCircle className="w-3 h-3 mr-1" />Mismatch</Badge>;
      case 'multiple':
        return <Badge variant="default" className="bg-purple-500"><Users className="w-3 h-3 mr-1" />Multiple</Badge>;
      default:
        return <Badge variant="outline">Not Found</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Stripe Customer ID Audit</h2>
        <p className="text-muted-foreground">
          Audit and fix mismatches between database and Stripe customer IDs
        </p>
      </div>

      {/* Summary Cards */}
      {auditSummary && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Profiles</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{auditSummary.totalProfiles}</div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Valid</CardTitle>
              <CheckCircle className="h-4 w-4 text-green-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-500">{auditSummary.validCustomers}</div>
              <p className="text-xs text-muted-foreground">
                {Math.round((auditSummary.validCustomers / auditSummary.totalProfiles) * 100)}%
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Invalid</CardTitle>
              <XCircle className="h-4 w-4 text-red-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-red-500">{auditSummary.invalidCustomers}</div>
              <p className="text-xs text-muted-foreground">Require attention</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Mismatches</CardTitle>
              <AlertCircle className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-yellow-500">{auditSummary.mismatches}</div>
              <p className="text-xs text-muted-foreground">Email/ID mismatches</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Not Found</CardTitle>
              <AlertCircle className="h-4 w-4 text-gray-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-gray-500">{auditSummary.notFound}</div>
              <p className="text-xs text-muted-foreground">No Stripe customer</p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Progress Bar */}
      {isAuditing && progress > 0 && (
        <div className="space-y-2">
          <Progress value={progress} className="w-full" />
          <p className="text-sm text-muted-foreground text-center">
            Auditing Stripe customers... {progress}%
          </p>
        </div>
      )}

      {/* Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Actions</CardTitle>
          <CardDescription>Run audit and fix issues</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <Button 
            onClick={runAudit} 
            disabled={isAuditing || isFixing}
            className="flex items-center gap-2"
          >
            <RefreshCw className={`w-4 h-4 ${isAuditing ? 'animate-spin' : ''}`} />
            {isAuditing ? 'Auditing...' : 'Run Audit'}
          </Button>

          <Button 
            onClick={() => runAutoFix(true)} 
            disabled={isAuditing || isFixing || !auditResults.length}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Eye className="w-4 h-4" />
            Preview Auto-Fix
          </Button>

          <Button 
            onClick={exportToCSV} 
            disabled={!auditResults.length}
            variant="outline"
            className="flex items-center gap-2"
          >
            <Download className="w-4 h-4" />
            Export CSV
          </Button>

          {auditSummary && (
            <div className="ml-auto text-sm text-muted-foreground">
              Last audit: {new Date(auditSummary.timestamp).toLocaleString()}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Filters */}
      {auditResults.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Filters</CardTitle>
          </CardHeader>
          <CardContent className="flex gap-4">
            <div className="flex-1">
              <Label htmlFor="search">Search</Label>
              <Input
                id="search"
                placeholder="Search by email or customer ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="w-48">
              <Label htmlFor="status">Status</Label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Statuses</SelectItem>
                  <SelectItem value="valid">Valid</SelectItem>
                  <SelectItem value="invalid">Invalid</SelectItem>
                  <SelectItem value="mismatch">Mismatch</SelectItem>
                  <SelectItem value="not_found">Not Found</SelectItem>
                  <SelectItem value="multiple">Multiple</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Results Table */}
      <Card>
        <CardHeader>
          <CardTitle>Audit Results</CardTitle>
          <CardDescription>
            {filteredResults.length} of {auditResults.length} results
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isAuditing ? (
            <div className="space-y-3">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : auditResults.length === 0 ? (
            <Alert>
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                No audit results yet. Click "Run Audit" to analyze all Stripe customer IDs.
              </AlertDescription>
            </Alert>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Email</TableHead>
                    <TableHead>DB Customer ID</TableHead>
                    <TableHead>Stripe Customer ID</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-center">Amazon</TableHead>
                    <TableHead className="text-center">Banks</TableHead>
                    <TableHead className="text-center">Cards</TableHead>
                    <TableHead className="text-center">Forecasts</TableHead>
                    <TableHead>Suggested Fix</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredResults.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="text-center text-muted-foreground">
                        No results match your filters
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredResults.map((result) => (
                      <TableRow key={result.userId}>
                        <TableCell className="font-medium">{result.email}</TableCell>
                        <TableCell>
                          <code className="text-xs">{result.dbCustomerId || '-'}</code>
                        </TableCell>
                        <TableCell>
                          {result.stripeCustomerId ? (
                            <div className="flex items-center gap-2">
                              <code className="text-xs">{result.stripeCustomerId}</code>
                              <a
                                href={`https://dashboard.stripe.com/customers/${result.stripeCustomerId}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline"
                              >
                                <ExternalLink className="w-3 h-3" />
                              </a>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell>{getStatusBadge(result.status)}</TableCell>
                        <TableCell className="text-center">
                          <Badge variant={result.amazonAccounts > 0 ? "default" : "secondary"}>
                            {result.amazonAccounts}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={result.bankAccounts > 0 ? "default" : "secondary"}>
                            {result.bankAccounts}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={result.creditCards > 0 ? "default" : "secondary"}>
                            {result.creditCards}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-center">
                          <Badge variant={result.forecasts > 0 ? "default" : "secondary"}>
                            {result.forecasts}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-sm text-muted-foreground max-w-xs truncate">
                          {result.suggestedFix || '-'}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            {result.canAutoFix && result.status !== 'valid' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => openFixDialog(result)}
                                disabled={isFixing}
                              >
                                <Edit className="w-3 h-3" />
                              </Button>
                            )}
                            {result.dbCustomerId && result.status === 'invalid' && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => {
                                  setSelectedUser(result);
                                  setFixAction('clear');
                                  setFixDialogOpen(true);
                                }}
                                disabled={isFixing}
                              >
                                <Trash2 className="w-3 h-3" />
                              </Button>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Fix Dialog */}
      <Dialog open={fixDialogOpen} onOpenChange={setFixDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Fix Customer ID</DialogTitle>
            <DialogDescription>
              Manually fix Stripe customer ID for {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <Label htmlFor="fixAction">Action</Label>
              <Select value={fixAction} onValueChange={(value: any) => setFixAction(value)}>
                <SelectTrigger id="fixAction">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="update">Update Customer ID</SelectItem>
                  <SelectItem value="clear">Clear Customer ID</SelectItem>
                  <SelectItem value="create">Create New Customer</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {fixAction === 'update' && (
              <div>
                <Label htmlFor="customerId">New Customer ID</Label>
                <Input
                  id="customerId"
                  placeholder="cus_..."
                  value={newCustomerId}
                  onChange={(e) => setNewCustomerId(e.target.value)}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Suggested: {selectedUser?.stripeCustomerId || 'N/A'}
                </p>
              </div>
            )}

            {fixAction === 'clear' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will remove the invalid customer ID from the database.
                </AlertDescription>
              </Alert>
            )}

            {fixAction === 'create' && (
              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  This will create a new Stripe customer for {selectedUser?.email} and update the database.
                </AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setFixDialogOpen(false)} disabled={isFixing}>
              Cancel
            </Button>
            <Button onClick={fixSingleUser} disabled={isFixing || (fixAction === 'update' && !newCustomerId)}>
              {isFixing ? 'Fixing...' : 'Apply Fix'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Auto-Fix Preview Dialog */}
      <Dialog open={autoFixDialogOpen} onOpenChange={setAutoFixDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Auto-Fix Preview</DialogTitle>
            <DialogDescription>
              Review changes before applying auto-fix
            </DialogDescription>
          </DialogHeader>

          {autoFixPreview && (
            <div className="space-y-4">
              <div className="grid grid-cols-3 gap-4">
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Will Fix</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-green-500">
                      {autoFixPreview.summary.fixed}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Will Skip</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-yellow-500">
                      {autoFixPreview.summary.skipped}
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-sm">Errors</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="text-2xl font-bold text-red-500">
                      {autoFixPreview.summary.errors}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Email</TableHead>
                      <TableHead>Action</TableHead>
                      <TableHead>Change</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {autoFixPreview.fixes.slice(0, 20).map((fix: any, idx: number) => (
                      <TableRow key={idx}>
                        <TableCell className="font-medium">{fix.email}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{fix.action}</Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {fix.action === 'clear' ? (
                            <span className="text-red-500">Remove: {fix.oldCustomerId}</span>
                          ) : (
                            <span className="text-green-500">
                              {fix.oldCustomerId ? `${fix.oldCustomerId} → ` : 'Add: '}
                              {fix.newCustomerId}
                            </span>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
                {autoFixPreview.fixes.length > 20 && (
                  <div className="p-4 text-center text-sm text-muted-foreground border-t">
                    ... and {autoFixPreview.fixes.length - 20} more changes
                  </div>
                )}
              </div>
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setAutoFixDialogOpen(false)} disabled={isFixing}>
              Cancel
            </Button>
            <Button onClick={() => runAutoFix(false)} disabled={isFixing}>
              <Play className="w-4 h-4 mr-2" />
              {isFixing ? 'Applying...' : 'Apply Auto-Fix'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}