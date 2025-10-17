import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { BreadcrumbNav } from "@/components/ui/breadcrumb-nav";
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
import { Search, Download, Send, Eye, Edit, CheckCircle, UserCog, MoreVertical } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";

export default function AdminMembers() {
  const { toast } = useToast();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [roleFilter, setRoleFilter] = useState<string>("all");
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [viewDetailsOpen, setViewDetailsOpen] = useState(false);
  const [verifyNINOpen, setVerifyNINOpen] = useState(false);
  const [ninValue, setNinValue] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 50;

  const { data: membersData, isLoading } = useQuery({
    queryKey: ["/api/members"],
  });

  const verifyNINMutation = useMutation({
    mutationFn: async ({ memberId, nin }: { memberId: string; nin: string }) => {
      return apiRequest("POST", `/api/members/${memberId}/verify-nin`, { nin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Success", description: "Member NIN verified successfully" });
      setVerifyNINOpen(false);
      setNinValue("");
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to verify NIN", variant: "destructive" });
    },
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

  const handleVerifyNIN = () => {
    if (!selectedMember || !ninValue) return;
    verifyNINMutation.mutate({ memberId: selectedMember.id, nin: ninValue });
  };

  const handleChangeRole = (userId: string, newRole: string) => {
    changeRoleMutation.mutate({ userId, role: newRole });
  };

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
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" data-testid={`button-actions-${member.id}`}>
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem 
                              onClick={() => {
                                setSelectedMember(member);
                                setViewDetailsOpen(true);
                              }}
                              data-testid={`action-view-${member.id}`}
                            >
                              <Eye className="h-4 w-4 mr-2" />
                              View Details
                            </DropdownMenuItem>
                            {member.status === 'pending' && (
                              <DropdownMenuItem 
                                onClick={() => {
                                  setSelectedMember(member);
                                  setVerifyNINOpen(true);
                                }}
                                data-testid={`action-verify-${member.id}`}
                              >
                                <CheckCircle className="h-4 w-4 mr-2" />
                                Verify NIN
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuItem 
                              onClick={() => handleChangeRole(member.user?.id, member.user?.role === 'admin' ? 'member' : 'admin')}
                              data-testid={`action-change-role-${member.id}`}
                            >
                              <UserCog className="h-4 w-4 mr-2" />
                              Change Role
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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

      <Sheet open={viewDetailsOpen} onOpenChange={setViewDetailsOpen}>
        <SheetContent className="w-[400px] sm:w-[540px]">
          <SheetHeader>
            <SheetTitle>Member Details</SheetTitle>
            <SheetDescription>Full information about the member</SheetDescription>
          </SheetHeader>
          {selectedMember && (
            <div className="mt-6 space-y-4">
              <div>
                <p className="text-sm font-medium">Member ID</p>
                <p className="text-sm text-muted-foreground font-mono">{selectedMember.memberId}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Full Name</p>
                <p className="text-sm text-muted-foreground">
                  {selectedMember.user?.firstName} {selectedMember.user?.lastName}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Email</p>
                <p className="text-sm text-muted-foreground">{selectedMember.user?.email}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Phone</p>
                <p className="text-sm text-muted-foreground">{selectedMember.user?.phone || 'Not provided'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">NIN</p>
                <p className="text-sm text-muted-foreground font-mono">{selectedMember.nin || 'Not verified'}</p>
              </div>
              <div>
                <p className="text-sm font-medium">Location</p>
                <p className="text-sm text-muted-foreground">
                  {selectedMember.ward?.name}, {selectedMember.ward?.lga?.name}, {selectedMember.ward?.lga?.state?.name}
                </p>
              </div>
              <div>
                <p className="text-sm font-medium">Status</p>
                <Badge variant={selectedMember.status === 'active' ? 'default' : 'secondary'}>
                  {selectedMember.status}
                </Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Role</p>
                <Badge variant="outline">{selectedMember.user?.role || 'member'}</Badge>
              </div>
              <div>
                <p className="text-sm font-medium">Join Date</p>
                <p className="text-sm text-muted-foreground">
                  {new Date(selectedMember.joinDate).toLocaleDateString()}
                </p>
              </div>
            </div>
          )}
        </SheetContent>
      </Sheet>

      <Dialog open={verifyNINOpen} onOpenChange={setVerifyNINOpen}>
        <DialogContent data-testid="dialog-verify-nin">
          <DialogHeader>
            <DialogTitle>Verify NIN</DialogTitle>
            <DialogDescription>
              Enter the member's National Identification Number to verify and activate their account.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Member</p>
              <p className="text-sm text-muted-foreground">
                {selectedMember?.user?.firstName} {selectedMember?.user?.lastName}
              </p>
            </div>
            <div>
              <Input
                placeholder="Enter 11-digit NIN"
                value={ninValue}
                onChange={(e) => setNinValue(e.target.value)}
                maxLength={11}
                data-testid="input-nin"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVerifyNINOpen(false)} data-testid="button-cancel-nin">
              Cancel
            </Button>
            <Button 
              onClick={handleVerifyNIN}
              disabled={ninValue.length !== 11}
              data-testid="button-verify-nin"
            >
              Verify & Activate
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
