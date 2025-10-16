import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MessageSquare, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface FeatureRequest {
  id: string;
  user_id: string | null;
  name: string;
  email: string;
  subject: string;
  message: string;
  priority: string;
  category: string;
  status: string;
  admin_notes: string | null;
  created_at: string;
  updated_at: string;
}

export const AdminFeatureRequests = () => {
  const [requests, setRequests] = useState<FeatureRequest[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<FeatureRequest | null>(null);
  const [adminNotes, setAdminNotes] = useState("");
  const [newStatus, setNewStatus] = useState<string>("");

  useEffect(() => {
    fetchFeatureRequests();
  }, []);

  const fetchFeatureRequests = async () => {
    try {
      const { data, error } = await supabase
        .from('feature_requests')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setRequests(data || []);
    } catch (error) {
      console.error('Error fetching feature requests:', error);
      toast.error('Failed to load feature requests');
    } finally {
      setIsLoading(false);
    }
  };

  const updateFeatureRequest = async (id: string, updates: Partial<FeatureRequest>) => {
    try {
      const { error } = await supabase
        .from('feature_requests')
        .update(updates)
        .eq('id', id);

      if (error) throw error;
      
      toast.success('Feature request updated');
      fetchFeatureRequests();
      setSelectedRequest(null);
      setAdminNotes("");
      setNewStatus("");
    } catch (error) {
      console.error('Error updating feature request:', error);
      toast.error('Failed to update feature request');
    }
  };

  const getPriorityColor = (priority: string): "destructive" | "default" | "secondary" => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
      default: return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'open': return <AlertCircle className="h-4 w-4" />;
      case 'in_progress': return <Clock className="h-4 w-4" />;
      case 'completed': return <CheckCircle className="h-4 w-4" />;
      case 'rejected': return <XCircle className="h-4 w-4" />;
      default: return <MessageSquare className="h-4 w-4" />;
    }
  };

  const getCategoryIcon = (category: string) => {
    switch (category) {
      case 'feature': return '✨';
      case 'improvement': return '📈';
      case 'bug': return '🐛';
      case 'integration': return '🔗';
      default: return '💡';
    }
  };

  if (isLoading) {
    return <div className="p-6">Loading feature requests...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-4 gap-4">
        {['open', 'in_progress', 'completed', 'rejected'].map((status) => (
          <Card key={status}>
            <CardHeader className="pb-3">
              <CardTitle className="text-sm font-medium flex items-center gap-2">
                {getStatusIcon(status)}
                {status.replace('_', ' ').toUpperCase()}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {requests.filter(r => r.status === status).length}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-4">
        {requests.map((request) => (
          <Card key={request.id} className="hover:shadow-lg transition-shadow">
            <CardHeader>
              <div className="flex items-start justify-between">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{getCategoryIcon(request.category)}</span>
                    <CardTitle className="text-lg">{request.subject}</CardTitle>
                  </div>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <span>{request.name}</span>
                    <span>•</span>
                    <span>{request.email}</span>
                    <span>•</span>
                    <span>{format(new Date(request.created_at), 'MMM d, yyyy')}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={getPriorityColor(request.priority)}>
                    {request.priority}
                  </Badge>
                  <Badge variant="outline" className="flex items-center gap-1">
                    {getStatusIcon(request.status)}
                    {request.status.replace('_', ' ')}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <p className="text-sm text-muted-foreground mb-2">Request:</p>
                <p className="text-sm">{request.message}</p>
              </div>
              
              {request.admin_notes && (
                <div>
                  <p className="text-sm text-muted-foreground mb-2">Admin Notes:</p>
                  <p className="text-sm bg-muted p-3 rounded-md">{request.admin_notes}</p>
                </div>
              )}

              {selectedRequest?.id === request.id ? (
                <div className="space-y-3 border-t pt-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Update Status</label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select new status" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="open">Open</SelectItem>
                        <SelectItem value="in_progress">In Progress</SelectItem>
                        <SelectItem value="completed">Completed</SelectItem>
                        <SelectItem value="rejected">Rejected</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Admin Notes</label>
                    <Textarea
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="Add notes about this request..."
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button
                      onClick={() => updateFeatureRequest(request.id, {
                        status: newStatus as any || request.status,
                        admin_notes: adminNotes || request.admin_notes
                      })}
                      disabled={!newStatus && !adminNotes}
                    >
                      Save Changes
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => {
                        setSelectedRequest(null);
                        setAdminNotes("");
                        setNewStatus("");
                      }}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectedRequest(request);
                    setAdminNotes(request.admin_notes || "");
                    setNewStatus(request.status);
                  }}
                >
                  Manage Request
                </Button>
              )}
            </CardContent>
          </Card>
        ))}

        {requests.length === 0 && (
          <Card>
            <CardContent className="py-12 text-center">
              <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
              <p className="text-muted-foreground">No feature requests yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};
