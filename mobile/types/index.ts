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
