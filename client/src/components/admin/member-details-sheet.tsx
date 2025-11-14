import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Plus, Edit, Trash2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MemberDetailsSheetProps {
  member: any;
  open: boolean;
  onClose: () => void;
}

export function MemberDetailsSheet({ member, open, onClose }: MemberDetailsSheetProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("info");
  const [noteDialogOpen, setNoteDialogOpen] = useState(false);
  const [editingNote, setEditingNote] = useState<any>(null);
  const [noteContent, setNoteContent] = useState("");
  const [noteVisibility, setNoteVisibility] = useState<"admin_only" | "coordinators">("admin_only");

  // Fetch status history (lazy loaded)
  const { data: statusHistory, isLoading: historyLoading } = useQuery({
    queryKey: ["/api/admin/members", member?.id, "status-history"],
    queryFn: async () => {
      const response = await fetch(`/api/admin/members/${member?.id}/status-history`);
      if (!response.ok) throw new Error("Failed to fetch status history");
      return response.json();
    },
    enabled: open && activeTab === "history" && !!member,
  });

  // Fetch member notes (lazy loaded)
  const { data: notesData, isLoading: notesLoading } = useQuery({
    queryKey: ["/api/admin/members", member?.id, "notes"],
    queryFn: async () => {
      const response = await fetch(`/api/admin/members/${member?.id}/notes`);
      if (!response.ok) throw new Error("Failed to fetch member notes");
      return response.json();
    },
    enabled: open && activeTab === "notes" && !!member,
  });

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async ({ memberId, content, visibility }: any) => {
      return apiRequest("POST", `/api/admin/members/${memberId}/notes`, { content, visibility });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members", member?.id, "notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Success", description: "Note created successfully" });
      setNoteDialogOpen(false);
      setNoteContent("");
      setNoteVisibility("admin_only");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to create note", variant: "destructive" });
    },
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async ({ noteId, content, visibility }: any) => {
      return apiRequest("PATCH", `/api/admin/members/${member?.id}/notes/${noteId}`, { content, visibility });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members", member?.id, "notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Success", description: "Note updated successfully" });
      setNoteDialogOpen(false);
      setEditingNote(null);
      setNoteContent("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update note", variant: "destructive" });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (noteId: string) => {
      return apiRequest("DELETE", `/api/admin/members/${member?.id}/notes/${noteId}`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/admin/members", member?.id, "notes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Success", description: "Note deleted successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to delete note", variant: "destructive" });
    },
  });

  const handleSaveNote = () => {
    if (!noteContent.trim()) {
      toast({ title: "Error", description: "Note content is required", variant: "destructive" });
      return;
    }

    if (editingNote) {
      updateNoteMutation.mutate({
        noteId: editingNote.id,
        content: noteContent,
        visibility: noteVisibility,
      });
    } else {
      createNoteMutation.mutate({
        memberId: member?.id,
        content: noteContent,
        visibility: noteVisibility,
      });
    }
  };

  const openEditNote = (note: any) => {
    setEditingNote(note);
    setNoteContent(note.note);
    setNoteVisibility(note.visibility);
    setNoteDialogOpen(true);
  };

  const openNewNote = () => {
    setEditingNote(null);
    setNoteContent("");
    setNoteVisibility("admin_only");
    setNoteDialogOpen(true);
  };

  if (!member) return null;

  const notes = (notesData as any)?.data || [];
  const history = (statusHistory as any)?.data || [];

  return (
    <>
      <Sheet open={open} onOpenChange={onClose}>
        <SheetContent className="w-[400px] sm:w-[600px] overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Member Details</SheetTitle>
            <SheetDescription>
              {member.user?.firstName} {member.user?.lastName} - {member.memberId}
            </SheetDescription>
          </SheetHeader>

          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-6">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="info" data-testid="tab-info">Information</TabsTrigger>
              <TabsTrigger value="history" data-testid="tab-history">History</TabsTrigger>
              <TabsTrigger value="notes" data-testid="tab-notes">Notes</TabsTrigger>
            </TabsList>

            <TabsContent value="info" className="space-y-4 mt-4">
              <div>
                <p className="text-sm font-medium">Member ID</p>
                <p className="text-sm text-muted-foreground font-mono">{member.memberId}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Full Name</p>
                <p className="text-sm text-muted-foreground">
                  {member.user?.firstName} {member.user?.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{member.user?.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">{member.user?.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">NIN</p>
                <p className="text-sm text-muted-foreground font-mono">{member.nin || 'Not verified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="text-sm text-muted-foreground">
                  {member.ward?.name}, {member.ward?.lga?.name}, {member.ward?.lga?.state?.name}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge variant={member.status === 'active' ? 'default' : 'secondary'}>
                  {member.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Role</p>
                <Badge variant="outline">{member.user?.role || 'member'}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Join Date</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(member.joinDate).toLocaleDateString()}
                </p>
              </div>
              {member.suspensionReason && (
                <div>
                  <p className="text-sm font-medium">Suspension Reason</p>
                  <p className="text-sm text-muted-foreground">{member.suspensionReason}</p>
                </div>
              )}
              {member.deletionReason && (
                <div>
                  <p className="text-sm font-medium">Deletion Reason</p>
                  <p className="text-sm text-muted-foreground">{member.deletionReason}</p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="history" className="mt-4">
              {historyLoading ? (
                <div className="text-sm text-muted-foreground">Loading history...</div>
              ) : history.length === 0 ? (
                <div className="text-sm text-muted-foreground">No status history available</div>
              ) : (
                <div className="space-y-3">
                  {history.map((entry: any) => (
                    <Card key={entry.id}>
                      <CardContent className="pt-4">
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <Badge variant={entry.toStatus === 'active' ? 'default' : 'secondary'}>
                                {entry.toStatus}
                              </Badge>
                              <span className="text-xs text-muted-foreground">
                                from {entry.fromStatus}
                              </span>
                            </div>
                            <p className="text-sm mt-2">{entry.reason}</p>
                            {entry.metadata && Object.keys(entry.metadata).length > 0 && (
                              <p className="text-xs text-muted-foreground mt-1">
                                via {entry.metadata.activatedVia || entry.metadata.suspendedVia || entry.metadata.restoredVia || 'admin panel'}
                              </p>
                            )}
                          </div>
                          <div className="text-xs text-muted-foreground text-right">
                            {new Date(entry.changedAt).toLocaleString()}
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="notes" className="mt-4">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-sm font-medium">Member Notes</h3>
                <Button size="sm" onClick={openNewNote} data-testid="button-add-note">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Note
                </Button>
              </div>

              {notesLoading ? (
                <div className="text-sm text-muted-foreground">Loading notes...</div>
              ) : notes.length === 0 ? (
                <div className="text-sm text-muted-foreground">No notes yet</div>
              ) : (
                <div className="space-y-3">
                  {notes.map((note: any) => (
                    <Card key={note.id}>
                      <CardHeader className="pb-3">
                        <div className="flex items-start justify-between">
                          <div>
                            <Badge variant="outline" className="mb-2">
                              {note.visibility === 'admin_only' ? 'Admin Only' : 'Coordinators'}
                            </Badge>
                            <p className="text-sm">{note.note}</p>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => openEditNote(note)}
                              data-testid={`button-edit-note-${note.id}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => deleteNoteMutation.mutate(note.id)}
                              data-testid={`button-delete-note-${note.id}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                        <CardDescription className="mt-2">
                          {new Date(note.createdAt).toLocaleString()}
                          {note.updatedAt !== note.createdAt && ' (edited)'}
                        </CardDescription>
                      </CardHeader>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </SheetContent>
      </Sheet>

      {/* Note Dialog (Create/Edit) */}
      <Dialog open={noteDialogOpen} onOpenChange={setNoteDialogOpen}>
        <DialogContent data-testid="dialog-note">
          <DialogHeader>
            <DialogTitle>{editingNote ? 'Edit Note' : 'Add Note'}</DialogTitle>
            <DialogDescription>
              {editingNote ? 'Update the member note' : 'Add a new note for this member'}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Note Content</p>
              <Textarea
                placeholder="Enter note content..."
                value={noteContent}
                onChange={(e) => setNoteContent(e.target.value)}
                rows={4}
                data-testid="input-note-content"
              />
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Visibility</p>
              <Select value={noteVisibility} onValueChange={(v: any) => setNoteVisibility(v)}>
                <SelectTrigger data-testid="select-note-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin_only">Admin Only</SelectItem>
                  <SelectItem value="coordinators">Coordinators</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNoteDialogOpen(false)} data-testid="button-cancel-note">
              Cancel
            </Button>
            <Button 
              onClick={handleSaveNote}
              disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
              data-testid="button-save-note"
            >
              {createNoteMutation.isPending || updateNoteMutation.isPending ? 'Saving...' : 'Save Note'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
