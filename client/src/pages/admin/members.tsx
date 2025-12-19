import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
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
import { Search, Download, Send, Eye, Edit, CheckCircle, UserCog, MoreVertical, Ban, UserCheck, Trash2, RefreshCw, Key, History, StickyNote } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

import { useMemberManagementDialogs } from "@/hooks/useMemberManagementDialogs";
import { MemberManagementDialogs } from "@/components/admin/member-management-dialogs";
import { MemberActionsMenu } from "@/components/admin/member-actions-menu";
import { MemberDetailsSheet } from "@/components/admin/member-details-sheet";

export default function AdminMembers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [page, setPage] = useState(1);
  const pageSize = 50;
  
  const dialogs = useMemberManagementDialogs();

  const { data: membersData, isLoading } = useQuery<{ success: boolean; data: any[] }>({
    queryKey: ["/api/members"],
  });

  const changeRoleMutation = useMutation({
    mutationFn: async ({ userId, role }: { userId: string; role: string }) => {
      return apiRequest("PATCH", `/api/users/${userId}/role`, { role });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Success", description: "Member role updated successfully" });
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to update role", variant: "destructive" });
    },
  });

  const handleMemberAction = (action: string, member: any) => {
    if (action === "change-role") {
      const newRole = member.user?.role === "admin" ? "member" : "admin";
      changeRoleMutation.mutate({ userId: member.user?.id, role: newRole });
    } else if (action === "view-details" || action === "view-history" || action === "view-notes") {
      dialogs.openDialog("view-details", member);
    } else {
      dialogs.openDialog(action as any, member);
    }
  };

  const members = membersData?.data || [];
  const filteredMembers = members.filter((member: any) => {
    const matchesSearch = 
      member.user?.firstName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user?.lastName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.user?.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.memberId?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || member.status === statusFilter;
    const matchesRole = roleFilter === "all" || member.user?.role === roleFilter;
    
    return matchesSearch && matchesStatus && matchesRole;
  });

  const paginatedMembers = filteredMembers.slice((page - 1) * pageSize, page * pageSize);
  const totalPages = Math.ceil(filteredMembers.length / pageSize);

  const exportToCSV = () => {
    const csv = [
      ['Member ID', 'Name', 'Email', 'Phone', 'Status', 'Ward', 'LGA', 'State', 'Join Date'],
      ...filteredMembers.map((m: any) => [
        m.memberId,
        `${m.user?.firstName} ${m.user?.lastName}`,
        m.user?.email,
        m.user?.phone || 'N/A',
        m.status,
        m.ward?.name || 'N/A',
        m.ward?.lga?.name || 'N/A',
        m.ward?.lga?.state?.name || 'N/A',
        new Date(m.joinDate).toLocaleDateString(),
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `members_${new Date().toISOString()}.csv`;
    a.click();
  };

  if (isLoading) {
    return <div className="p-6">Loading members...</div>;
  }

  return (
    <div className="space-y-6">
      <BreadcrumbNav items={[{ label: 'Admin', href: '/admin/dashboard' }, { label: 'Members' }]} />
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="font-display text-3xl font-bold" data-testid="text-members-title">Members Management</h1>
          <p className="text-muted-foreground mt-1">Manage all registered members</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportToCSV} data-testid="button-export-csv">
            <Download className="h-4 w-4 mr-2" />
            Export CSV
          </Button>
          <Button variant="outline" data-testid="button-send-notification">
            <Send className="h-4 w-4 mr-2" />
            Send Notification
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col md:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name, email, or member ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                  data-testid="input-search-members"
                />
              </div>
            </div>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-status-filter">
                <SelectValue placeholder="Filter by status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="pending">Pending</SelectItem>
                <SelectItem value="suspended">Suspended</SelectItem>
                <SelectItem value="deleted">Deleted</SelectItem>
                <SelectItem value="expired">Expired</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[180px]" data-testid="select-role-filter">
                <SelectValue placeholder="Filter by role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="member">Member</SelectItem>
                <SelectItem value="coordinator">Coordinator</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Member ID</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Phone</TableHead>
                  <TableHead>Location</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Join Date</TableHead>
                  <TableHead>Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedMembers.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-muted-foreground">
                      No members found
                    </TableCell>
                  </TableRow>
                ) : (
                  paginatedMembers.map((member: any) => (
                    <TableRow key={member.id} data-testid={`member-row-${member.id}`}>
                      <TableCell className="font-mono">{member.memberId}</TableCell>
                      <TableCell>
                        {member.user?.firstName} {member.user?.lastName}
                      </TableCell>
                      <TableCell>{member.user?.email}</TableCell>
                      <TableCell>{member.user?.phone || 'N/A'}</TableCell>
                      <TableCell>
                        <div className="text-sm">
                          <div>{member.ward?.name || 'N/A'}</div>
                          <div className="text-muted-foreground text-xs">
                            {member.ward?.lga?.name}, {member.ward?.lga?.state?.name}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={member.status === 'active' ? 'default' : member.status === 'pending' ? 'secondary' : 'destructive'}
                          data-testid={`badge-status-${member.id}`}
                        >
                          {member.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <Badge variant="outline" data-testid={`badge-role-${member.id}`}>
                          {member.user?.role || 'member'}
                        </Badge>
                      </TableCell>
                      <TableCell>{new Date(member.joinDate).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <MemberActionsMenu member={member} onAction={handleMemberAction} />
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>

          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              Showing {((page - 1) * pageSize) + 1} to {Math.min(page * pageSize, filteredMembers.length)} of {filteredMembers.length} members
            </p>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={page === 1}
                data-testid="button-prev-page"
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={page === totalPages}
                data-testid="button-next-page"
              >
                Next
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Member Details Sheet with Tabs */}
      <MemberDetailsSheet
        member={dialogs.selectedMember}
        open={dialogs.isOpen("view-details")}
        onClose={dialogs.closeDialog}
      />

      {/* All Account Management Dialogs */}
      <MemberManagementDialogs
        selectedMember={dialogs.selectedMember}
        activeDialog={dialogs.activeDialog}
        onClose={dialogs.closeDialog}
      />
    </div>
  );
}
