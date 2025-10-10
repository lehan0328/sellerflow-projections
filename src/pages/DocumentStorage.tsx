import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileText, Download, Trash2, Eye, Search, Calendar, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useCustomers } from "@/hooks/useCustomers";
import { useVendors } from "@/hooks/useVendors";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface StoredDocument {
  name: string;
  id: string;
  created_at: string;
  metadata: Record<string, any>;
  customer_id?: string;
  vendor_id?: string;
  customer_name?: string;
  vendor_name?: string;
  notes?: string;
}

export default function DocumentStorage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedCustomer, setSelectedCustomer] = useState<string>("all");
  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<StoredDocument | null>(null);
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");

  const { customers, addCustomer } = useCustomers();
  const { vendors } = useVendors();

  // Fetch documents with metadata
  const { data: documents, isLoading } = useQuery({
    queryKey: ['documents', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];
      
      const { data: files, error: filesError } = await supabase.storage
        .from('purchase-orders')
        .list(user.id, {
          sortBy: { column: 'created_at', order: 'desc' }
        });

      if (filesError) throw filesError;

      // Fetch metadata for all files
      const { data: metadata, error: metadataError } = await supabase
        .from('documents_metadata')
        .select(`
          *,
          customer:customers(name),
          vendor:vendors(name)
        `)
        .eq('user_id', user.id);

      if (metadataError) throw metadataError;

      // Merge storage files with metadata
      return files.map(file => {
        const meta = metadata?.find(m => m.file_name === file.name);
        return {
          ...file,
          customer_id: meta?.customer_id,
          vendor_id: meta?.vendor_id,
          customer_name: meta?.customer?.name,
          vendor_name: meta?.vendor?.name,
          notes: meta?.notes
        } as StoredDocument;
      });
    },
    enabled: !!user?.id,
  });

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${user.id}/${fileName}`;

      const { error } = await supabase.storage
        .from('purchase-orders')
        .upload(filePath, file);

      if (error) throw error;
      return fileName;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', user?.id] });
      toast.success('Document uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileName: string) => {
      if (!user?.id) throw new Error('Not authenticated');
      
      const { error } = await supabase.storage
        .from('purchase-orders')
        .remove([`${user.id}/${fileName}`]);

      if (error) throw error;

      // Also delete metadata
      await supabase
        .from('documents_metadata')
        .delete()
        .eq('user_id', user.id)
        .eq('file_name', fileName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', user?.id] });
      toast.success('Document deleted successfully');
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  // Update metadata mutation
  const updateMetadataMutation = useMutation({
    mutationFn: async ({ fileName, customerId, vendorId, notes }: { 
      fileName: string; 
      customerId?: string;
      vendorId?: string;
      notes?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('documents_metadata')
        .upsert({
          user_id: user.id,
          file_name: fileName,
          file_path: `${user.id}/${fileName}`,
          customer_id: customerId || null,
          vendor_id: vendorId || null,
          notes: notes || null
        }, {
          onConflict: 'user_id,file_path'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', user?.id] });
      toast.success('Document updated successfully');
      setEditingDoc(null);
    },
    onError: (error: Error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });

  // Create new customer mutation
  const createCustomerMutation = useMutation({
    mutationFn: async (name: string) => {
      const newCustomer = await addCustomer({
        name,
        paymentTerms: 'immediate'
      });
      return newCustomer;
    },
    onSuccess: () => {
      toast.success('Customer created successfully');
      setShowNewCustomerDialog(false);
      setNewCustomerName("");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create customer: ${error.message}`);
    },
  });

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (20MB max)
    if (file.size > 20 * 1024 * 1024) {
      toast.error('File size must be less than 20MB');
      return;
    }

    setUploading(true);
    try {
      await uploadMutation.mutateAsync(file);
    } finally {
      setUploading(false);
      event.target.value = '';
    }
  };

  const handleDownload = async (fileName: string) => {
    if (!user?.id) return;

    const { data, error } = await supabase.storage
      .from('purchase-orders')
      .download(`${user.id}/${fileName}`);

    if (error) {
      toast.error('Failed to download document');
      return;
    }

    const url = URL.createObjectURL(data);
    const a = document.createElement('a');
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleView = async (fileName: string) => {
    if (!user?.id) return;

    const { data } = supabase.storage
      .from('purchase-orders')
      .getPublicUrl(`${user.id}/${fileName}`);

    if (data.publicUrl) {
      window.open(data.publicUrl, '_blank');
    }
  };

  const filteredDocuments = documents?.filter(doc => {
    const nameMatch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
    
    // Month filter
    let monthMatch = true;
    if (selectedMonth !== "all") {
      const docDate = new Date(doc.created_at);
      const docMonth = `${docDate.getFullYear()}-${String(docDate.getMonth() + 1).padStart(2, '0')}`;
      monthMatch = docMonth === selectedMonth;
    }
    
    // Customer filter
    let customerMatch = true;
    if (selectedCustomer !== "all") {
      customerMatch = doc.customer_id === selectedCustomer;
    }
    
    // Vendor filter
    let vendorMatch = true;
    if (selectedVendor !== "all") {
      vendorMatch = doc.vendor_id === selectedVendor;
    }
    
    return nameMatch && monthMatch && customerMatch && vendorMatch;
  }) || [];

  // Get unique months from documents for filter dropdown
  const availableMonths = useMemo(() => {
    if (!documents) return [];
    
    const months = new Set<string>();
    documents.forEach(doc => {
      const date = new Date(doc.created_at);
      const monthKey = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      months.add(monthKey);
    });
    
    return Array.from(months).sort().reverse();
  }, [documents]);

  const formatMonthLabel = (monthKey: string) => {
    const [year, month] = monthKey.split('-');
    const date = new Date(parseInt(year), parseInt(month) - 1);
    return date.toLocaleDateString('en-US', { year: 'numeric', month: 'long' });
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-primary/5 to-accent/10 p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/dashboard')}
              className="hover:bg-primary/10"
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Document Storage
              </h1>
              <p className="text-muted-foreground mt-1">
                Manage your business documents and files
              </p>
            </div>
          </div>

          <div className="flex items-center space-x-3 flex-wrap gap-2">
            <Select value={selectedMonth} onValueChange={setSelectedMonth}>
              <SelectTrigger className="w-48">
                <Calendar className="h-4 w-4 mr-2" />
                <SelectValue placeholder="All months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {availableMonths.map((month) => (
                  <SelectItem key={month} value={month}>
                    {formatMonthLabel(month)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All customers" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All customers</SelectItem>
                {customers?.map((customer) => (
                  <SelectItem key={customer.id} value={customer.id}>
                    {customer.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <Select value={selectedVendor} onValueChange={setSelectedVendor}>
              <SelectTrigger className="w-48">
                <SelectValue placeholder="All vendors" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All vendors</SelectItem>
                {vendors?.map((vendor) => (
                  <SelectItem key={vendor.id} value={vendor.id}>
                    {vendor.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search documents..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64 pl-9"
              />
            </div>
            <label htmlFor="file-upload">
              <Button
                disabled={uploading}
                asChild
              >
                <span className="cursor-pointer">
                  <Upload className="h-4 w-4 mr-2" />
                  {uploading ? 'Uploading...' : 'Upload Document'}
                </span>
              </Button>
              <input
                id="file-upload"
                type="file"
                className="hidden"
                onChange={handleFileUpload}
                disabled={uploading}
              />
            </label>
          </div>
        </div>

        {/* Documents Card */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Your Documents</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-12 text-muted-foreground">
                Loading documents...
              </div>
            ) : filteredDocuments.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">
                  {searchQuery ? 'No documents match your search' : 'No documents uploaded yet'}
                </p>
                <p className="text-sm text-muted-foreground mt-2">
                  Upload your first document to get started
                </p>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Customer</TableHead>
                    <TableHead>Vendor</TableHead>
                    <TableHead>Size</TableHead>
                    <TableHead>Uploaded</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <TableRow key={doc.id}>
                      <TableCell className="font-medium">
                        <div className="flex items-center space-x-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span>{doc.name}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm">
                        {doc.customer_name || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell className="text-sm">
                        {doc.vendor_name || <span className="text-muted-foreground">-</span>}
                      </TableCell>
                      <TableCell>{formatFileSize(doc.metadata?.size || doc.metadata?.eTag?.length || 0)}</TableCell>
                      <TableCell>{formatDate(doc.created_at)}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setEditingDoc(doc)}
                            title="Edit document details"
                          >
                            <FileText className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleView(doc.name)}
                            title="View document"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDownload(doc.name)}
                            title="Download document"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeleteTarget(doc.name)}
                            className="text-destructive hover:text-destructive"
                            title="Delete document"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Document</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{deleteTarget}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteTarget && deleteMutation.mutate(deleteTarget)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Document Dialog */}
      <Dialog open={!!editingDoc} onOpenChange={() => setEditingDoc(null)}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Document Details</DialogTitle>
            <DialogDescription>
              Link this document to a customer or vendor
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Customer</Label>
              <div className="flex gap-2">
                <Select 
                  value={editingDoc?.customer_id || "none"} 
                  onValueChange={(value) => {
                    if (editingDoc) {
                      setEditingDoc({...editingDoc, customer_id: value === "none" ? undefined : value});
                    }
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue placeholder="Select customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">No customer</SelectItem>
                    {customers?.map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={() => setShowNewCustomerDialog(true)}
                  title="Add new customer"
                >
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Vendor</Label>
              <Select 
                value={editingDoc?.vendor_id || "none"} 
                onValueChange={(value) => {
                  if (editingDoc) {
                    setEditingDoc({...editingDoc, vendor_id: value === "none" ? undefined : value});
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select vendor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No vendor</SelectItem>
                  {vendors?.map((vendor) => (
                    <SelectItem key={vendor.id} value={vendor.id}>
                      {vendor.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Notes</Label>
              <Input
                placeholder="Add notes about this document..."
                value={editingDoc?.notes || ""}
                onChange={(e) => {
                  if (editingDoc) {
                    setEditingDoc({...editingDoc, notes: e.target.value});
                  }
                }}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingDoc(null)}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                if (editingDoc) {
                  updateMetadataMutation.mutate({
                    fileName: editingDoc.name,
                    customerId: editingDoc.customer_id,
                    vendorId: editingDoc.vendor_id,
                    notes: editingDoc.notes
                  });
                }
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* New Customer Dialog */}
      <Dialog open={showNewCustomerDialog} onOpenChange={setShowNewCustomerDialog}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
            <DialogDescription>
              Create a new customer to link to your documents
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="customer-name">Customer Name</Label>
              <Input
                id="customer-name"
                placeholder="Enter customer name"
                value={newCustomerName}
                onChange={(e) => setNewCustomerName(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowNewCustomerDialog(false);
              setNewCustomerName("");
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => createCustomerMutation.mutate(newCustomerName)}
              disabled={!newCustomerName.trim()}
            >
              Create Customer
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
