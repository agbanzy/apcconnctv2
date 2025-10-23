// Re-export types from shared schema
// This allows the mobile app to use the same types as the backend
export type {
  User,
  Member,
  Election,
  Candidate,
  Event,
  VolunteerTask,
  Quiz,
  IssueCampaign,
  Badge,
  Achievement,
  MicroTask,
} from '@shared/schema';

// Mobile-specific types
export interface TabBarIconProps {
  focused: boolean;
  color: string;
  size: number;
}

export interface AuthContextType {
  user: any | null;
  member: any | null;
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: any) => Promise<void>;
  logout: () => Promise<void>;
}
