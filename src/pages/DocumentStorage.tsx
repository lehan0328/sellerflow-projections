import { useState, useMemo, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Upload, FileText, Download, Trash2, Search, Calendar as CalendarIcon, Plus, Loader2, RefreshCw, Edit, HardDrive, ChevronDown } from "lucide-react";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { format } from "date-fns";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { useAuth } from "@/hooks/useAuth";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useVendors } from "@/hooks/useVendors";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
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
  vendor_id?: string;
  vendor_name?: string;
  notes?: string;
  document_date?: string;
  display_name?: string;
  amount?: number;
  description?: string;
  document_type?: string;
  line_items?: Array<{
    description?: string;
    product_name?: string;
    quantity?: number;
    unit_price?: number;
    total_price?: number;
  }>;
  untracked?: boolean; // from storage without metadata
}

export default function DocumentStorage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [uploading, setUploading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedMonth, setSelectedMonth] = useState<string>("all");
  const [selectedVendor, setSelectedVendor] = useState<string>("all");
  const [deleteTarget, setDeleteTarget] = useState<string | null>(null);
  const [editingDoc, setEditingDoc] = useState<StoredDocument | null>(null);
  const [showNewCustomerDialog, setShowNewCustomerDialog] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState("");
  const [replacingDocument, setReplacingDocument] = useState<string | null>(null);
  const [includeUntracked, setIncludeUntracked] = useState(false);

  // Storage limit: 2GB
  const STORAGE_LIMIT_BYTES = 2 * 1024 * 1024 * 1024; // 2GB in bytes

  const { vendors } = useVendors();

  // Fetch user's account_id
  const { data: profile } = useQuery({
    queryKey: ['profile', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data, error } = await supabase
        .from('profiles')
        .select('account_id')
        .eq('user_id', user.id)
        .maybeSingle();
      
      if (error) throw error;
      return data;
    },
    enabled: !!user?.id,
  });

  // Fetch documents with metadata
  const { data: documents, isLoading, refetch } = useQuery({
    queryKey: ['documents', profile?.account_id, includeUntracked],
    queryFn: async () => {
      if (!profile?.account_id) return [];
      
      // Fetch all metadata first
      const { data: metadata, error: metadataError } = await supabase
        .from('documents_metadata')
        .select(`
          *,
          vendor:vendors(name),
          purchase_order_line_items(
            description,
            product_name,
            quantity,
            unit_price,
            total_price
          )
        `)
        .eq('account_id', profile.account_id);

      if (metadataError) throw metadataError;

      // Always fetch storage files to verify existence
      let files: any[] = [];
      try {
        const pageSize = 1000;
        let offset = 0;
        while (true) {
          const { data: storageFiles, error: filesError } = await supabase.storage
            .from('purchase-orders')
            .list(profile.account_id, {
              limit: pageSize,
              offset,
              sortBy: { column: 'created_at', order: 'desc' }
            });

          if (filesError) break;
          if (!storageFiles || storageFiles.length === 0) break;

          files = files.concat(storageFiles);
          if (storageFiles.length < pageSize) break;
          offset += pageSize;
        }
      } catch (error) {
        console.warn('Could not fetch storage files:', error);
      }

      // Create a map of storage files for quick lookup
      const storageFilesMap = new Map(files.map(f => [f.name, f]));

      // Build documents from metadata and include any storage files missing metadata
      const docsFromMeta = (metadata || []).map(meta => {
        const storageFile = storageFilesMap.get(meta.file_name);
        return {
          id: meta.id,
          name: meta.file_name,
          created_at: meta.created_at,
          metadata: storageFile?.metadata || {},
          vendor_id: meta.vendor_id,
          vendor_name: (meta as any).vendor?.name,
          notes: meta.notes,
          document_date: meta.document_date || meta.created_at,
          display_name: meta.display_name || meta.file_name,
          amount: meta.amount,
          description: meta.description,
          document_type: meta.document_type,
          file_path: meta.file_path,
          storage_exists: !!storageFile,
          storage_file: storageFile,
          file_size: storageFile?.metadata?.size || 0,
          line_items: (meta as any).purchase_order_line_items || []
        } as StoredDocument & { storage_exists: boolean; storage_file?: any; file_size: number };
      });

      const metaNames = new Set(docsFromMeta.map(d => d.name));

      // Add storage-only files that don't have metadata rows yet (optional)
      const untrackedFromStorage = includeUntracked ? (
        files
          .filter(f => !metaNames.has(f.name))
          .map(f => ({
            id: `storage-${f.name}`,
            name: f.name,
            created_at: (f as any).created_at || new Date().toISOString(),
            metadata: f.metadata || {},
            vendor_id: undefined,
            vendor_name: undefined,
            notes: undefined,
            document_date: undefined,
            display_name: f.name,
            amount: undefined,
            description: undefined,
            document_type: undefined,
            file_path: `${profile.account_id}/${f.name}`,
            storage_exists: true,
            storage_file: f,
            file_size: f.metadata?.size || 0,
            line_items: [],
            untracked: true
          }))
      ) : [] as any[];

      const allDocs = includeUntracked ? [...docsFromMeta, ...untrackedFromStorage] : docsFromMeta;

      return allDocs
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    },
    enabled: !!profile?.account_id,
    staleTime: 0, // Always refetch when query is invalidated
    refetchInterval: 30000, // Periodic refresh for eventual consistency
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  // Realtime updates: refresh when metadata or storage objects change
  useEffect(() => {
    if (!profile?.account_id) return;
    const channel = supabase
      .channel('document-storage-realtime')
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'documents_metadata',
        filter: `account_id=eq.${profile.account_id}`
      }, () => {
        queryClient.invalidateQueries({ queryKey: ['documents', profile.account_id] });
      })
      .on('postgres_changes', {
        event: '*',
        schema: 'storage',
        table: 'objects',
        filter: 'bucket_id=eq.purchase-orders'
      }, (payload) => {
        const objectName = (payload.new as any)?.name || (payload.old as any)?.name || '';
        if (typeof objectName === 'string' && objectName.startsWith(`${profile.account_id}/`)) {
          queryClient.invalidateQueries({ queryKey: ['documents', profile.account_id] });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.account_id, queryClient]);

  // Calculate total storage used
  const totalStorageUsed = useMemo(() => {
    if (!documents) return 0;
    return documents.reduce((total, doc) => total + ((doc as any).file_size || 0), 0);
  }, [documents]);

  // Format bytes to human readable
  const formatBytes = (bytes: number): string => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + ' ' + sizes[i];
  };

  const storagePercentage = (totalStorageUsed / STORAGE_LIMIT_BYTES) * 100;

  // Upload mutation
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      if (!profile?.account_id) throw new Error('Not authenticated');
      
      const fileName = `${Date.now()}_${file.name}`;
      const filePath = `${profile.account_id}/${fileName}`;

      const { error } = await supabase.storage
        .from('purchase-orders')
        .upload(filePath, file);

      if (error) throw error;
      return fileName;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', profile?.account_id] });
      toast.success('Document uploaded successfully');
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (fileName: string) => {
      if (!profile?.account_id) throw new Error('Not authenticated');
      
      const { error } = await supabase.storage
        .from('purchase-orders')
        .remove([`${profile.account_id}/${fileName}`]);

      if (error) throw error;

      // Also delete metadata
      await supabase
        .from('documents_metadata')
        .delete()
        .eq('account_id', profile.account_id)
        .eq('file_name', fileName);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', profile?.account_id] });
      toast.success('Document deleted successfully');
      setDeleteTarget(null);
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  // Update metadata mutation
  const updateMetadataMutation = useMutation({
    mutationFn: async ({ fileName, vendorId, notes, documentDate, displayName, description }: { 
      fileName: string; 
      vendorId?: string;
      notes?: string;
      documentDate?: string;
      displayName?: string;
      description?: string;
    }) => {
      if (!user?.id || !profile?.account_id) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('documents_metadata')
        .upsert({
          user_id: user.id,
          account_id: profile.account_id,
          file_name: fileName,
          file_path: `${profile.account_id}/${fileName}`,
          vendor_id: vendorId || null,
          notes: notes || null,
          document_date: documentDate || null,
          display_name: displayName || null,
          description: description || null
        }, {
          onConflict: 'user_id,file_path'
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', profile?.account_id] });
      toast.success('Document updated successfully');
      setEditingDoc(null);
    },
    onError: (error: Error) => {
      toast.error(`Update failed: ${error.message}`);
    },
  });


  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [uploadVendorId, setUploadVendorId] = useState<string>("");
  const [uploadDocumentDate, setUploadDocumentDate] = useState<Date | undefined>(new Date());
  const [showAddVendorFromUpload, setShowAddVendorFromUpload] = useState(false);

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file size (50MB max as per reference)
    if (file.size > 50 * 1024 * 1024) {
      toast.error('File size must be less than 50MB');
      return;
    }

    // Check if upload would exceed storage limit
    if (totalStorageUsed + file.size > STORAGE_LIMIT_BYTES) {
      toast.error(`Upload would exceed your 2GB storage limit. You have ${formatBytes(STORAGE_LIMIT_BYTES - totalStorageUsed)} remaining.`);
      return;
    }

    setUploadFile(file);
  };

  const confirmUpload = async () => {
    if (!uploadFile) {
      toast.error('Please select a file');
      return;
    }
    
    if (!uploadVendorId) {
      toast.error('Please select a vendor');
      return;
    }
    
    if (!uploadDocumentDate) {
      toast.error('Please select a document date');
      return;
    }

    setUploading(true);
    try {
      if (!user?.id || !profile?.account_id) {
        throw new Error('Not authenticated');
      }

      // Create filename first
      const fileName = `${Date.now()}_${uploadFile.name}`;
      const filePath = `${profile.account_id}/${fileName}`;

      // Upload file to storage
      const { error: uploadError } = await supabase.storage
        .from('purchase-orders')
        .upload(filePath, uploadFile);

      if (uploadError) throw uploadError;

      // Create metadata immediately after successful upload
      const { error: metadataError } = await supabase
        .from('documents_metadata')
        .insert({
          user_id: user.id,
          account_id: profile.account_id,
          file_name: fileName,
          file_path: filePath,
          vendor_id: uploadVendorId,
          document_date: uploadDocumentDate.toISOString().split('T')[0]
        });

      if (metadataError) throw metadataError;

      queryClient.invalidateQueries({ queryKey: ['documents', profile.account_id] });
      toast.success('Document uploaded successfully');
      
      // Reset form
      setUploadFile(null);
      setUploadVendorId("");
      setUploadDocumentDate(new Date());
    } catch (error: any) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleReplaceDocument = async (doc: StoredDocument, file: File) => {
    try {
      setReplacingDocument(doc.id);
      if (!profile?.account_id) throw new Error('User not authenticated');

      // Get the document metadata by file_name
      const { data: metadataList, error: metaError } = await supabase
        .from('documents_metadata')
        .select('*')
        .eq('account_id', profile.account_id)
        .eq('file_name', doc.name)
        .maybeSingle();

      if (metaError) throw metaError;

      // Delete old file from storage
      const { error: deleteError } = await supabase.storage
        .from('purchase-orders')
        .remove([`${profile.account_id}/${doc.name}`]);

      if (deleteError) console.error('Error deleting old file:', deleteError);

      // Upload new file with new timestamped name
      const fileExtension = file.name.split('.').pop();
      const safeFileName = `${Date.now()}_${file.name}`;
      const filePath = `${profile.account_id}/${safeFileName}`;

      const { error: uploadError } = await supabase.storage
        .from('purchase-orders')
        .upload(filePath, file);

      if (uploadError) throw uploadError;

      // Update metadata with new file path and name, keeping all other data
      if (metadataList) {
        const { error: updateError } = await supabase
          .from('documents_metadata')
          .update({
            file_path: filePath,
            file_name: safeFileName,
            updated_at: new Date().toISOString()
          })
          .eq('id', metadataList.id);

        if (updateError) throw updateError;
      }

      toast.success('Document replaced successfully');
      queryClient.invalidateQueries({ queryKey: ['documents', profile?.account_id] });
    } catch (error) {
      console.error('Error replacing document:', error);
      toast.error('Failed to replace document');
    } finally {
      setReplacingDocument(null);
    }
  };

  // Repair/Sync function to find and fix missing files
  const repairMutation = useMutation({
    mutationFn: async () => {
      if (!profile?.account_id) throw new Error('Not authenticated');
      
      const accountId = profile.account_id;
      
      // Get all files from storage at root and in account folder
      const { data: rootFiles } = await supabase.storage
        .from('purchase-orders')
        .list('', { limit: 1000 });
      
      const { data: accountFiles } = await supabase.storage
        .from('purchase-orders')
        .list(accountId, { limit: 1000 });
      
      // Get all metadata
      const { data: metadata } = await supabase
        .from('documents_metadata')
        .select('*')
        .eq('account_id', accountId);
      
      let fixed = 0;
      let missing = 0;
      
      for (const meta of metadata || []) {
        const expectedPath = `${accountId}/${meta.file_name}`;
        const fileInExpectedLocation = accountFiles?.find(f => f.name === meta.file_name);
        
        if (fileInExpectedLocation) {
          // File is in correct location, update metadata if needed
          if (meta.file_path !== expectedPath) {
            await supabase
              .from('documents_metadata')
              .update({ file_path: expectedPath })
              .eq('id', meta.id);
            fixed++;
          }
        } else {
          // File not in expected location - check old file_path location
          let moved = false;
          
          // If file_path contains a slash, it might be in a user_id folder
          if (meta.file_path && meta.file_path.includes('/')) {
            try {
              // Try to move from old path to new path
              const { error: moveError } = await supabase.storage
                .from('purchase-orders')
                .move(meta.file_path, expectedPath);
              
              if (!moveError) {
                // Successfully moved, update metadata
                await supabase
                  .from('documents_metadata')
                  .update({ file_path: expectedPath })
                  .eq('id', meta.id);
                fixed++;
                moved = true;
              }
            } catch (error) {
              console.error(`Failed to move from ${meta.file_path}:`, error);
            }
          }
          
          // If not moved yet, check if file exists at root level
          if (!moved) {
            const fileAtRoot = rootFiles?.find(f => f.name === meta.file_name);
            if (fileAtRoot) {
              try {
                const { data: fileData } = await supabase.storage
                  .from('purchase-orders')
                  .download(meta.file_name);
                
                if (fileData) {
                  await supabase.storage
                    .from('purchase-orders')
                    .upload(expectedPath, fileData, { upsert: true });
                  
                  await supabase.storage
                    .from('purchase-orders')
                    .remove([meta.file_name]);
                  
                  await supabase
                    .from('documents_metadata')
                    .update({ file_path: expectedPath })
                    .eq('id', meta.id);
                  
                  fixed++;
                  moved = true;
                }
              } catch (error) {
                console.error('Error moving file from root:', error);
              }
            }
          }
          
          if (!moved) {
            missing++;
          }
        }
      }
      
      return { fixed, missing };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['documents', profile?.account_id] });
      toast.success(`Repair complete: ${data.fixed} fixed, ${data.missing} missing`);
    },
    onError: (error: Error) => {
      toast.error(`Repair failed: ${error.message}`);
    },
  });

  const handleDownload = async (fileName: string, doc: any) => {
    if (!profile?.account_id) return;

    // Check if file doesn't exist in storage
    if (doc.storage_exists === false) {
      toast.error('File is missing from storage. Try clicking "Sync/Repair Files" first.');
      return;
    }

    // Try downloading from the file_path in metadata first, then fallback to expected path
    const pathsToTry = [
      doc.file_path || `${profile.account_id}/${fileName}`,
      `${profile.account_id}/${fileName}`
    ];

    for (const path of pathsToTry) {
      const { data, error } = await supabase.storage
        .from('purchase-orders')
        .download(path);

      if (!error && data) {
        const url = URL.createObjectURL(data);
        const a = document.createElement('a');
        a.href = url;
        a.download = fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        return;
      }
    }

    toast.error('Failed to download document. File may be in an old location - try "Sync/Repair Files".');
  };

  const filteredDocuments = documents?.filter(doc => {
    // Show ALL documents, even if storage file is missing
    // The UI will indicate when a file is missing
    
    // Search in file name, display name, notes, and description
    const searchLower = searchQuery.toLowerCase();
    const nameMatch = doc.name.toLowerCase().includes(searchLower);
    const displayNameMatch = doc.display_name?.toLowerCase().includes(searchLower);
    const notesMatch = doc.notes?.toLowerCase().includes(searchLower);
    const descriptionMatch = (doc.description || '').toLowerCase().includes(searchLower);
    
    const matchesSearch = nameMatch || displayNameMatch || notesMatch || descriptionMatch;
    
    // Month filter
    let monthMatch = true;
    if (selectedMonth !== "all") {
      const docDate = new Date(doc.created_at);
      const docMonth = `${docDate.getFullYear()}-${String(docDate.getMonth() + 1).padStart(2, '0')}`;
      monthMatch = docMonth === selectedMonth;
    }
    
    // Vendor filter
    let vendorMatch = true;
    if (selectedVendor !== "all") {
      vendorMatch = doc.vendor_id === selectedVendor;
    }
    
    return matchesSearch && monthMatch && vendorMatch;
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
          <div>
            <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Document Storage
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage your business documents and files • {formatFileSize(totalStorageUsed)} used
            </p>
          </div>
          <Button
            variant="outline"
            onClick={() => repairMutation.mutate()}
            disabled={repairMutation.isPending}
          >
            {repairMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <Upload className="h-4 w-4 mr-2" />
                Sync/Repair Files
              </>
            )}
          </Button>
        </div>


        {/* Upload Form Card */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between mb-2">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <HardDrive className="h-5 w-5" />
                  Upload Document
                </CardTitle>
                <p className="text-sm text-muted-foreground mt-1">
                  Upload PDF files (Max 50MB) with vendor information
                </p>
              </div>
            </div>
            
            {/* Storage Usage */}
            <div className="space-y-2 mt-4 p-4 bg-muted/30 rounded-lg border">
              <div className="flex items-center justify-between text-sm">
                <span className="font-medium">Storage Usage</span>
                <span className={cn(
                  "font-semibold",
                  storagePercentage > 90 ? "text-destructive" : storagePercentage > 75 ? "text-yellow-600" : "text-muted-foreground"
                )}>
                  {formatBytes(totalStorageUsed)} / {formatBytes(STORAGE_LIMIT_BYTES)}
                </span>
              </div>
              <Progress value={storagePercentage} className="h-2" />
              <p className="text-xs text-muted-foreground">
                {storagePercentage > 90 
                  ? "Storage almost full - consider deleting unused documents" 
                  : `${formatBytes(STORAGE_LIMIT_BYTES - totalStorageUsed)} available`}
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Vendor *</Label>
                  <div className="flex gap-2">
                    <Select value={uploadVendorId} onValueChange={setUploadVendorId}>
                      <SelectTrigger className="flex-1">
                        <SelectValue placeholder="Select a vendor" />
                      </SelectTrigger>
                      <SelectContent>
                        {vendors?.map((vendor) => (
                          <SelectItem key={vendor.id} value={vendor.id}>
                            {vendor.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => setShowAddVendorFromUpload(true)}
                      title="Add new vendor"
                    >
                      <Plus className="h-4 w-4" />
                    </Button>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Document Date *</Label>
                  <Input
                    type="date"
                    value={uploadDocumentDate ? format(uploadDocumentDate, "yyyy-MM-dd") : ""}
                    onChange={(e) => {
                      if (e.target.value) {
                        setUploadDocumentDate(new Date(e.target.value));
                      }
                    }}
                    className="w-full"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>PDF File *</Label>
                <Input
                  type="file"
                  accept=".pdf"
                  onChange={handleFileSelect}
                  className="cursor-pointer"
                />
                {uploadFile && (
                  <p className="text-sm text-muted-foreground">
                    Selected: {uploadFile.name} ({formatFileSize(uploadFile.size)})
                  </p>
                )}
              </div>

              <Button 
                className="w-full" 
                onClick={confirmUpload} 
                disabled={!uploadFile || !uploadVendorId || !uploadDocumentDate || uploading}
              >
                <Upload className="h-4 w-4 mr-2" />
                {uploading ? 'Uploading...' : 'Upload Document'}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Documents Card */}
        <Card>
          <CardHeader>
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">Your Documents</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    toast.info('Refreshing documents...');
                    refetch();
                  }}
                  disabled={isLoading}
                >
                  <RefreshCw className={cn("h-4 w-4 mr-2", isLoading && "animate-spin")} />
                  Refresh
                </Button>
              </div>
              
              {/* Filters */}
              <div className="flex items-center space-x-3 flex-wrap gap-2">
                <Select value={selectedMonth} onValueChange={setSelectedMonth}>
                  <SelectTrigger className="w-48">
                    <CalendarIcon className="h-4 w-4 mr-2" />
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
                
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search by name, vendor, description..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-9"
                  />
                </div>

                <div className="flex items-center gap-2 pl-1">
                  <Switch id="toggle-untracked" checked={includeUntracked} onCheckedChange={setIncludeUntracked} />
                  <Label htmlFor="toggle-untracked" className="text-sm text-muted-foreground">Include untracked files</Label>
                </div>
              </div>
            </div>
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
              <Table className="w-full">
                <colgroup>
                  <col style={{ width: '25%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '10%' }} />
                  <col style={{ width: '11%' }} />
                  <col style={{ width: '8%' }} />
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '12%' }} />
                </colgroup>
                <TableHeader>
                  <TableRow className="bg-background border-b hover:bg-background">
                    <TableHead className="bg-background font-semibold px-4 py-3">Name</TableHead>
                    <TableHead className="bg-background font-semibold px-4 py-3 text-left">Type</TableHead>
                    <TableHead className="bg-background font-semibold px-4 py-3">Vendor</TableHead>
                    <TableHead className="bg-background font-semibold px-4 py-3">Amount</TableHead>
                    <TableHead className="bg-background font-semibold px-4 py-3">Document Date</TableHead>
                    <TableHead className="bg-background font-semibold px-4 py-3">Size</TableHead>
                    <TableHead className="bg-background font-semibold px-4 py-3">Uploaded</TableHead>
                    <TableHead className="bg-background font-semibold px-4 py-3 text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredDocuments.map((doc) => (
                    <Collapsible key={doc.id}>
                      <TableRow className="align-top">
                        <TableCell className="font-medium px-4 py-3">
                          <div className="flex items-center space-x-2">
                            <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                            <span 
                              className="cursor-pointer hover:text-primary transition-colors truncate"
                              onClick={() => setEditingDoc(doc)}
                              title="Click to edit document name"
                            >
                              {doc.display_name || doc.name}
                            </span>
                            {!(doc as any).storage_exists && (
                              <Badge variant="destructive" className="text-xs ml-2 flex-shrink-0">
                                Missing File
                              </Badge>
                            )}
                            {(doc as any).untracked && (
                              <Badge variant="secondary" className="text-xs ml-2 flex-shrink-0">
                                Untracked
                              </Badge>
                            )}
                            <CollapsibleTrigger asChild>
                              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 flex-shrink-0" aria-label="Toggle document details">
                                <ChevronDown className="h-4 w-4" />
                              </Button>
                            </CollapsibleTrigger>
                          </div>
                        </TableCell>
                        <TableCell className="text-sm px-4 py-3 text-left">
                          {doc.document_type ? (
                            <span className="capitalize">{doc.document_type.replace('_', ' ')}</span>
                          ) : (
                            <span className="text-muted-foreground">-</span>
                          )}
                        </TableCell>
                        <TableCell className="text-sm px-4 py-3">
                          {doc.vendor_name || <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-sm font-medium px-4 py-3">
                          {doc.amount ? `$${doc.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="text-sm px-4 py-3">
                          {doc.document_date ? format(new Date(doc.document_date), "MMM dd, yyyy") : <span className="text-muted-foreground">-</span>}
                        </TableCell>
                        <TableCell className="px-4 py-3">{formatFileSize((doc as any).file_size || 0)}</TableCell>
                        <TableCell className="px-4 py-3">{formatDate(doc.created_at)}</TableCell>
                        <TableCell className="text-right px-4 py-3">
                          <div className="flex justify-end space-x-2">
                            {doc.document_type === 'purchase_order' && (
                              <>
                                <input
                                  type="file"
                                  id={`replace-${doc.id}`}
                                  className="hidden"
                                  accept="image/*,.pdf"
                                  onChange={(e) => {
                                    const file = e.target.files?.[0];
                                    if (file) {
                                      handleReplaceDocument(doc, file);
                                      e.target.value = ''; // Reset input
                                    }
                                  }}
                                />
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => document.getElementById(`replace-${doc.id}`)?.click()}
                                  disabled={replacingDocument === doc.id}
                                  title="Replace document file"
                                >
                                  {replacingDocument === doc.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Upload className="h-4 w-4" />
                                  )}
                                </Button>
                              </>
                            )}
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingDoc(doc)}
                              title="Edit document details"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDownload(doc.name, doc)}
                              title="Download document"
                              disabled={!(doc as any).storage_exists}
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
                      <TableRow>
                        <TableCell colSpan={8} className="p-0 border-0">
                          <CollapsibleContent>
                            <div className="py-4 bg-muted/30">
                              {doc.line_items && doc.line_items.length > 0 ? (
                                <div className="space-y-2 px-4">
                                  <div className="text-sm font-semibold mb-3">Line Items ({doc.line_items.length})</div>
                                  <div className="space-y-1.5">
                                    {doc.line_items.map((item, idx) => (
                                      <div key={idx} className="flex items-start justify-between text-sm py-1">
                                        <div className="flex-1 pr-4">
                                          {item.description || item.product_name || '-'}
                                        </div>
                                        <div className="text-right whitespace-nowrap">
                                          <span className="text-muted-foreground">Qty: </span>
                                          <span>{item.quantity || '-'}</span>
                                          <span className="mx-1.5 text-muted-foreground">@</span>
                                          <span>{item.unit_price ? Number(item.unit_price).toFixed(2) : '-'}</span>
                                          <span className="ml-3 font-medium">
                                            {item.total_price ? Number(item.total_price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) : '-'}
                                          </span>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-3 px-4">
                                  <div className="text-sm font-semibold mb-2">Details</div>
                                  <div className="text-sm text-muted-foreground">No line items found for this document.</div>
                                  <div className="grid md:grid-cols-3 gap-4 text-sm">
                                    <div>
                                      <div className="font-medium">Description</div>
                                      <div>{doc.description || '-'}</div>
                                    </div>
                                    <div>
                                      <div className="font-medium">Qty</div>
                                      <div>-</div>
                                    </div>
                                    <div>
                                      <div className="font-medium">Amount</div>
                                      <div>{doc.amount ? `$${Number(doc.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : '-'}</div>
                                    </div>
                                    <div className="md:col-span-3">
                                      <div className="font-medium">Notes</div>
                                      <div>{doc.notes || '-'}</div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          </CollapsibleContent>
                        </TableCell>
                      </TableRow>
                    </Collapsible>
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
              Update document name, vendor, and other details
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Display Name</Label>
              <Input
                placeholder="Document name"
                value={editingDoc?.display_name || editingDoc?.name || ""}
                onChange={(e) => {
                  if (editingDoc) {
                    setEditingDoc({...editingDoc, display_name: e.target.value});
                  }
                }}
              />
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
              <Label>Document Date</Label>
              <Input
                type="date"
                value={editingDoc?.document_date || ""}
                onChange={(e) => {
                  if (editingDoc) {
                    setEditingDoc({...editingDoc, document_date: e.target.value});
                  }
                }}
              />
            </div>

            <div className="space-y-2">
              <Label>Description</Label>
              <Input
                placeholder="Add description..."
                value={editingDoc?.description || ""}
                onChange={(e) => {
                  if (editingDoc) {
                    setEditingDoc({...editingDoc, description: e.target.value});
                  }
                }}
              />
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
                    vendorId: editingDoc.vendor_id,
                    notes: editingDoc.notes,
                    documentDate: editingDoc.document_date,
                    displayName: editingDoc.display_name,
                    description: editingDoc.description
                  });
                }
              }}
            >
              Save Changes
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
