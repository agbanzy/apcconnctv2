import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
import { useToast } from "@/hooks/use-toast";

interface MemberManagementDialogsProps {
  selectedMember: any;
  activeDialog: string | null;
  onClose: () => void;
}

export function MemberManagementDialogs({
  selectedMember,
  activeDialog,
  onClose,
}: MemberManagementDialogsProps) {
  const { toast } = useToast();
  const [reason, setReason] = useState("");
  const [ninValue, setNinValue] = useState("");

  // Suspend account mutation
  const suspendMutation = useMutation({
    mutationFn: async ({ memberId, reason }: { memberId: string; reason: string }) => {
      return apiRequest("POST", `/api/admin/members/${memberId}/suspend`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Success", description: "Member account suspended successfully" });
      setReason("");
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to suspend account", 
        variant: "destructive" 
      });
    },
  });

  // Activate account mutation
  const activateMutation = useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      return apiRequest("POST", `/api/admin/members/${memberId}/activate`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Success", description: "Member account activated successfully" });
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to activate account", 
        variant: "destructive" 
      });
    },
  });

  // Delete account mutation
  const deleteMutation = useMutation({
    mutationFn: async ({ memberId, reason }: { memberId: string; reason: string }) => {
      return apiRequest("POST", `/api/admin/members/${memberId}/delete`, { reason });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Success", description: "Member account deleted successfully" });
      setReason("");
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to delete account", 
        variant: "destructive" 
      });
    },
  });

  // Restore account mutation
  const restoreMutation = useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      return apiRequest("POST", `/api/admin/members/${memberId}/restore`, {});
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Success", description: "Member account restored successfully" });
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to restore account", 
        variant: "destructive" 
      });
    },
  });

  // Reset password mutation
  const resetPasswordMutation = useMutation({
    mutationFn: async ({ memberId }: { memberId: string }) => {
      return apiRequest("POST", `/api/admin/members/${memberId}/reset-password`, {});
    },
    onSuccess: (response: any) => {
      const password = response?.data?.temporaryPassword;
      toast({ 
        title: "Password Reset", 
        description: password 
          ? `Temporary password: ${password}` 
          : "Password reset email sent to member",
        duration: 10000,
      });
      onClose();
    },
    onError: (error: any) => {
      toast({ 
        title: "Error", 
        description: error.message || "Failed to reset password", 
        variant: "destructive" 
      });
    },
  });

  // Verify NIN mutation
  const verifyNINMutation = useMutation({
    mutationFn: async ({ memberId, nin }: { memberId: string; nin: string }) => {
      return apiRequest("POST", `/api/members/${memberId}/verify-nin`, { nin });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/members"] });
      toast({ title: "Success", description: "Member NIN verified successfully" });
      setNinValue("");
      onClose();
    },
    onError: () => {
      toast({ title: "Error", description: "Failed to verify NIN", variant: "destructive" });
    },
  });

  const handleSuspend = () => {
    if (!selectedMember || !reason.trim()) {
      toast({ title: "Error", description: "Suspension reason is required", variant: "destructive" });
      return;
    }
    suspendMutation.mutate({ memberId: selectedMember.id, reason });
  };

  const handleActivate = () => {
    if (!selectedMember) return;
    activateMutation.mutate({ memberId: selectedMember.id });
  };

  const handleDelete = () => {
    if (!selectedMember || !reason.trim()) {
      toast({ title: "Error", description: "Deletion reason is required", variant: "destructive" });
      return;
    }
    deleteMutation.mutate({ memberId: selectedMember.id, reason });
  };

  const handleRestore = () => {
    if (!selectedMember) return;
    restoreMutation.mutate({ memberId: selectedMember.id });
  };

  const handleResetPassword = () => {
    if (!selectedMember) return;
    resetPasswordMutation.mutate({ memberId: selectedMember.id });
  };

  const handleVerifyNIN = () => {
    if (!selectedMember || !ninValue) return;
    verifyNINMutation.mutate({ memberId: selectedMember.id, nin: ninValue });
  };

  return (
    <>
      {/* Suspend Account Dialog */}
      <Dialog open={activeDialog === "suspend"} onOpenChange={(open) => !open && onClose()}>
        <DialogContent data-testid="dialog-suspend-member">
          <DialogHeader>
            <DialogTitle>Suspend Member Account</DialogTitle>
            <DialogDescription>
              Suspending this account will immediately revoke access. The member will not be able to log in until the account is reactivated.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Member</p>
              <p className="text-sm text-muted-foreground">
                {selectedMember?.user?.firstName} {selectedMember?.user?.lastName} ({selectedMember?.memberId})
              </p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Reason for Suspension *</p>
              <Textarea
                placeholder="Enter the reason for suspending this account..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                data-testid="input-suspend-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} data-testid="button-cancel-suspend">
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleSuspend}
              disabled={!reason.trim() || suspendMutation.isPending}
              data-testid="button-confirm-suspend"
            >
              {suspendMutation.isPending ? "Suspending..." : "Suspend Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Activate Account Dialog */}
      <AlertDialog open={activeDialog === "activate"} onOpenChange={(open) => !open && onClose()}>
        <AlertDialogContent data-testid="dialog-activate-member">
          <AlertDialogHeader>
            <AlertDialogTitle>Activate Member Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to activate this account? The member will regain full access immediately.
              <div className="mt-4 p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">
                  {selectedMember?.user?.firstName} {selectedMember?.user?.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{selectedMember?.memberId}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-activate">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleActivate}
              disabled={activateMutation.isPending}
              data-testid="button-confirm-activate"
            >
              {activateMutation.isPending ? "Activating..." : "Activate Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Account Dialog */}
      <Dialog open={activeDialog === "delete"} onOpenChange={(open) => !open && onClose()}>
        <DialogContent data-testid="dialog-delete-member">
          <DialogHeader>
            <DialogTitle>Delete Member Account</DialogTitle>
            <DialogDescription>
              This is a soft delete. The account will be marked as deleted but can be restored later. The member will lose access immediately.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <p className="text-sm font-medium mb-2">Member</p>
              <p className="text-sm text-muted-foreground">
                {selectedMember?.user?.firstName} {selectedMember?.user?.lastName} ({selectedMember?.memberId})
              </p>
            </div>
            <div>
              <p className="text-sm font-medium mb-2">Reason for Deletion *</p>
              <Textarea
                placeholder="Enter the reason for deleting this account..."
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
                data-testid="input-delete-reason"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={onClose} data-testid="button-cancel-delete">
              Cancel
            </Button>
            <Button 
              variant="destructive"
              onClick={handleDelete}
              disabled={!reason.trim() || deleteMutation.isPending}
              data-testid="button-confirm-delete"
            >
              {deleteMutation.isPending ? "Deleting..." : "Delete Account"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Restore Account Dialog */}
      <AlertDialog open={activeDialog === "restore"} onOpenChange={(open) => !open && onClose()}>
        <AlertDialogContent data-testid="dialog-restore-member">
          <AlertDialogHeader>
            <AlertDialogTitle>Restore Member Account</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to restore this deleted account? The member will regain access immediately.
              <div className="mt-4 p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">
                  {selectedMember?.user?.firstName} {selectedMember?.user?.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{selectedMember?.memberId}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-restore">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleRestore}
              disabled={restoreMutation.isPending}
              data-testid="button-confirm-restore"
            >
              {restoreMutation.isPending ? "Restoring..." : "Restore Account"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Reset Password Dialog */}
      <AlertDialog open={activeDialog === "reset-password"} onOpenChange={(open) => !open && onClose()}>
        <AlertDialogContent data-testid="dialog-reset-password">
          <AlertDialogHeader>
            <AlertDialogTitle>Reset Member Password</AlertDialogTitle>
            <AlertDialogDescription>
              This will generate a new temporary password for the member. In production, a password reset email will be sent.
              <div className="mt-4 p-3 bg-muted rounded-md">
                <p className="text-sm font-medium">
                  {selectedMember?.user?.firstName} {selectedMember?.user?.lastName}
                </p>
                <p className="text-sm text-muted-foreground">{selectedMember?.user?.email}</p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel data-testid="button-cancel-reset-password">Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleResetPassword}
              disabled={resetPasswordMutation.isPending}
              data-testid="button-confirm-reset-password"
            >
              {resetPasswordMutation.isPending ? "Resetting..." : "Reset Password"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Verify NIN Dialog */}
      <Dialog open={activeDialog === "verify-nin"} onOpenChange={(open) => !open && onClose()}>
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
            <Button variant="outline" onClick={() => { setNinValue(""); onClose(); }} data-testid="button-cancel-nin">
              Cancel
            </Button>
            <Button 
              onClick={handleVerifyNIN}
              disabled={ninValue.length !== 11 || verifyNINMutation.isPending}
              data-testid="button-verify-nin"
            >
              {verifyNINMutation.isPending ? "Verifying..." : "Verify & Activate"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
