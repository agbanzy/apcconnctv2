import { useState } from "react";

export type MemberAction = 
  | "suspend" 
  | "activate" 
  | "delete" 
  | "restore" 
  | "reset-password"
  | "view-details"
  | "verify-nin"
  | null;

export function useMemberManagementDialogs() {
  const [selectedMember, setSelectedMember] = useState<any>(null);
  const [activeDialog, setActiveDialog] = useState<MemberAction>(null);

  const openDialog = (action: MemberAction, member: any) => {
    setSelectedMember(member);
    setActiveDialog(action);
  };

  const closeDialog = () => {
    setActiveDialog(null);
    // Keep selectedMember for a moment to allow exit animations
    setTimeout(() => setSelectedMember(null), 200);
  };

  return {
    selectedMember,
    activeDialog,
    openDialog,
    closeDialog,
    isOpen: (action: MemberAction) => activeDialog === action,
  };
}
