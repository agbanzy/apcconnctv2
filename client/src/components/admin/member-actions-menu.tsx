import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { MoreVertical, Eye, CheckCircle, UserCog, Ban, UserCheck, Trash2, RefreshCw, Key, History, StickyNote } from "lucide-react";

interface MemberActionsMenuProps {
  member: any;
  onAction: (action: string, member: any) => void;
}

export function MemberActionsMenu({ member, onAction }: MemberActionsMenuProps) {
  const isActive = member.status === "active";
  const isSuspended = member.status === "suspended";
  const isDeleted = member.status === "deleted";
  const isPending = member.status === "pending";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" data-testid={`button-actions-${member.id}`}>
          <MoreVertical className="h-4 w-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-48">
        {/* View Actions */}
        <DropdownMenuItem 
          onClick={() => onAction("view-details", member)}
          data-testid={`action-view-${member.id}`}
        >
          <Eye className="h-4 w-4 mr-2" />
          View Details
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => onAction("view-history", member)}
          data-testid={`action-history-${member.id}`}
        >
          <History className="h-4 w-4 mr-2" />
          Status History
        </DropdownMenuItem>
        
        <DropdownMenuItem 
          onClick={() => onAction("view-notes", member)}
          data-testid={`action-notes-${member.id}`}
        >
          <StickyNote className="h-4 w-4 mr-2" />
          View Notes
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Status Actions */}
        {isPending && (
          <DropdownMenuItem 
            onClick={() => onAction("verify-nin", member)}
            data-testid={`action-verify-${member.id}`}
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Verify NIN
          </DropdownMenuItem>
        )}

        {(isActive || isPending) && (
          <DropdownMenuItem 
            onClick={() => onAction("suspend", member)}
            data-testid={`action-suspend-${member.id}`}
          >
            <Ban className="h-4 w-4 mr-2" />
            Suspend Account
          </DropdownMenuItem>
        )}

        {isSuspended && (
          <DropdownMenuItem 
            onClick={() => onAction("activate", member)}
            data-testid={`action-activate-${member.id}`}
          >
            <UserCheck className="h-4 w-4 mr-2" />
            Activate Account
          </DropdownMenuItem>
        )}

        {isDeleted && (
          <DropdownMenuItem 
            onClick={() => onAction("restore", member)}
            data-testid={`action-restore-${member.id}`}
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Restore Account
          </DropdownMenuItem>
        )}

        {!isDeleted && (
          <DropdownMenuItem 
            onClick={() => onAction("delete", member)}
            className="text-destructive focus:text-destructive"
            data-testid={`action-delete-${member.id}`}
          >
            <Trash2 className="h-4 w-4 mr-2" />
            Delete Account
          </DropdownMenuItem>
        )}

        <DropdownMenuSeparator />

        {/* Management Actions */}
        <DropdownMenuItem 
          onClick={() => onAction("change-role", member)}
          data-testid={`action-change-role-${member.id}`}
        >
          <UserCog className="h-4 w-4 mr-2" />
          Change Role
        </DropdownMenuItem>

        <DropdownMenuItem 
          onClick={() => onAction("reset-password", member)}
          data-testid={`action-reset-password-${member.id}`}
        >
          <Key className="h-4 w-4 mr-2" />
          Reset Password
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
