import { create } from 'zustand';
import { User, UserRole } from '../types';

export const DEFAULT_SANDBOX_USERS: User[] = [
  {
    id: '00000000-0000-0000-0000-000000000001',
    email: 'sarah.jenkins@spatialdesign.com',
    name: 'Sarah Jenkins',
    role: 'principal',
    avatar_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    created_at: new Date().toISOString()
  },
  {
    id: '00000000-0000-0000-0000-000000000002',
    email: 'david.miller@spatialdesign.com',
    name: 'David Miller',
    role: 'senior',
    avatar_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    created_at: new Date().toISOString()
  },
  {
    id: '00000000-0000-0000-0000-000000000003',
    email: 'elena.rostova@spatialdesign.com',
    name: 'Elena Rostova',
    role: 'senior',
    avatar_url: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150',
    created_at: new Date().toISOString()
  },
  {
    id: '00000000-0000-0000-0000-000000000004',
    email: 'alex.rivers@spatialdesign.com',
    name: 'Alex Rivers',
    role: 'junior',
    avatar_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150',
    created_at: new Date().toISOString()
  },
  {
    id: '00000000-0000-0000-0000-000000000005',
    email: 'liam.chen@spatialdesign.com',
    name: 'Liam Chen',
    role: 'junior',
    avatar_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=150',
    created_at: new Date().toISOString()
  },
  {
    id: '00000000-0000-0000-0000-000000000006',
    email: 'admin@spatialdesign.com',
    name: 'Admin User',
    role: 'admin',
    avatar_url: 'https://images.unsplash.com/photo-1500048993953-d23a436266cf?w=150',
    created_at: new Date().toISOString()
  }
];

interface AuthState {
  currentUser: User | null;
  currentRole: UserRole | null;
  allUsers: User[];
  isInitialized: boolean;
  isSandboxMode: boolean;
  login: (userId: string) => void;
  loginByEmail: (email: string, selectedRole?: UserRole) => Promise<boolean>;
  logout: () => void;
  switchRole: (role: UserRole) => void;
  initialize: () => Promise<void>;
  updateUserRole: (userId: string, role: UserRole) => Promise<boolean>;
  setSandboxMode: (enabled: boolean) => void;
}

const getApiUrl = () => {
  if (typeof window !== 'undefined') {
    const hn = window.location.hostname;
    if (hn === 'localhost' || hn === '127.0.0.1' || hn === '[::1]' || hn.startsWith('192.168.') || hn.startsWith('10.') || hn.startsWith('172.')) {
      return 'http://localhost:5000';
    }
  }
  const rawApiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
  return rawApiUrl.replace(/\/$/, '');
};
const API_URL = getApiUrl();


const mapDbUser = (dbUser: any): User => ({
  id: dbUser.id,
  email: dbUser.email,
  name: dbUser.full_name,
  role: dbUser.system_role as UserRole,
  avatar_url: dbUser.avatar_url || undefined,
  created_at: dbUser.created_at
});

export const useAuthStore = create<AuthState>((set, get) => ({
  currentUser: null,
  currentRole: null,
  allUsers: DEFAULT_SANDBOX_USERS,
  isInitialized: false,
  isSandboxMode: false,

  login: (userId: string) => {
    const user = get().allUsers.find((u) => u.id === userId) || null;
    if (user) {
      set({ currentUser: user, currentRole: user.role });
      localStorage.setItem('auth_user_id', user.id);
    }
  },

  loginByEmail: async (email: string, selectedRole: UserRole = 'junior') => {
    try {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail) return false;

      if (get().isSandboxMode) {
        let user = get().allUsers.find((u) => u.email === cleanEmail) || null;
        if (!user) {
          const newUserId = '00000000-0000-0000-0000-' + Math.random().toString(16).slice(2, 14).padStart(12, '0');
          const namePart = cleanEmail.split('@')[0];
          const fullName = namePart
            .split(/[._\-+]/)
            .map(word => word.charAt(0).toUpperCase() + word.slice(1))
            .join(' ');

          user = {
            id: newUserId,
            email: cleanEmail,
            name: fullName,
            role: selectedRole,
            avatar_url: selectedRole === 'principal'
              ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
              : selectedRole === 'senior'
              ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
              : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
            created_at: new Date().toISOString()
          };
          set((state) => ({ allUsers: [user!, ...state.allUsers] }));
        }

        set({ currentUser: user, currentRole: user.role });
        localStorage.setItem('auth_user_id', user.id);
        return true;
      }

      // 1. Fetch all users to see if user already exists
      const res = await fetch(`${API_URL}/api/users`);
      if (!res.ok) throw new Error('Failed to fetch users');
      const { data: dbUsers } = await res.json();
      const dbUser = dbUsers?.find((u: any) => u.email === cleanEmail);

      if (dbUser) {
        const user = mapDbUser(dbUser);
        set((state) => {
          const exists = state.allUsers.some(u => u.id === user.id);
          const updatedUsers = exists ? state.allUsers.map(u => u.id === user.id ? user : u) : [user, ...state.allUsers];
          return {
            currentUser: user,
            currentRole: user.role,
            allUsers: updatedUsers
          };
        });
        localStorage.setItem('auth_user_id', user.id);
        return true;
      }

      // 2. Create a new user profile if the email doesn't exist
      const newUserId = '00000000-0000-0000-0000-' + Math.random().toString(16).slice(2, 14).padStart(12, '0');
      const namePart = cleanEmail.split('@')[0];
      const fullName = namePart
        .split(/[._\-+]/)
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

      const newUser = {
        id: newUserId,
        email: cleanEmail,
        full_name: fullName,
        system_role: selectedRole,
        avatar_url: selectedRole === 'principal'
          ? 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150'
          : selectedRole === 'senior'
          ? 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150'
          : 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
      };

      const insertRes = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newUser)
      });

      if (insertRes.ok) {
        const mappedUser = mapDbUser(newUser);
        set((state) => ({
          currentUser: mappedUser,
          currentRole: mappedUser.role,
          allUsers: [mappedUser, ...state.allUsers]
        }));
        localStorage.setItem('auth_user_id', mappedUser.id);
        return true;
      } else {
        const errData = await insertRes.json();
        console.error("Failed to create new user profile in Backend:", errData);
        return false;
      }
    } catch (e) {
      console.error("Failed to authenticate by email", e);
      return false;
    }
  },

  logout: () => {
    set({ currentUser: null, currentRole: null });
    localStorage.removeItem('auth_user_id');
  },

  switchRole: (role: UserRole) => {
    const user = get().allUsers.find((u) => u.role === role) || null;
    if (user) {
      set({ currentUser: user, currentRole: role });
      localStorage.setItem('auth_user_id', user.id);
    }
  },

  initialize: async () => {
    if (get().isInitialized) return;

    const sandboxEnabled = typeof window !== 'undefined' && localStorage.getItem('use_sandbox_mode') === 'true';
    set({ isSandboxMode: sandboxEnabled });

    if (sandboxEnabled) {
      set({ allUsers: DEFAULT_SANDBOX_USERS });
      const storedUserId = localStorage.getItem('auth_user_id');
      if (storedUserId) {
        const user = DEFAULT_SANDBOX_USERS.find((u: User) => u.id === storedUserId);
        if (user) {
          set({ currentUser: user, currentRole: user.role });
        }
      }
      set({ isInitialized: true });
      return;
    }

    try {
      const res = await fetch(`${API_URL}/api/users`);
      if (res.ok) {
        const { data: dbUsers } = await res.json();
        const users: User[] = (dbUsers || []).map(mapDbUser);
        set({ allUsers: users });

        const storedUserId = localStorage.getItem('auth_user_id');
        if (storedUserId) {
          const user = users.find((u: User) => u.id === storedUserId);
          if (user) {
            set({ currentUser: user, currentRole: user.role });
          }
        }
      } else {
        console.error("Backend auth initialize error status:", res.status);
        set({ allUsers: DEFAULT_SANDBOX_USERS });
        const storedUserId = localStorage.getItem('auth_user_id');
        if (storedUserId) {
          const user = DEFAULT_SANDBOX_USERS.find((u: User) => u.id === storedUserId);
          if (user) {
            set({ currentUser: user, currentRole: user.role });
          }
        }
      }
    } catch (e) {
      console.error("Failed to initialize auth from Backend, falling back to Sandbox users:", e);
      set({ allUsers: DEFAULT_SANDBOX_USERS });
      const storedUserId = localStorage.getItem('auth_user_id');
      if (storedUserId) {
        const user = DEFAULT_SANDBOX_USERS.find((u: User) => u.id === storedUserId);
        if (user) {
          set({ currentUser: user, currentRole: user.role });
        }
      }
    } finally {
      set({ isInitialized: true });
    }
  },

  updateUserRole: async (userId: string, role: UserRole) => {
    if (get().isSandboxMode) {
      const user = get().allUsers.find((u) => u.id === userId);
      if (!user) return false;
      const updatedUser = { ...user, role };
      set((state) => {
        const updatedUsers = state.allUsers.map((u) => u.id === userId ? updatedUser : u);
        const isSelf = state.currentUser?.id === userId;
        return {
          allUsers: updatedUsers,
          currentUser: isSelf ? updatedUser : state.currentUser,
          currentRole: isSelf ? updatedUser.role : state.currentRole
        };
      });
      return true;
    }

    try {
      const res = await fetch(`${API_URL}/api/users/${userId}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ system_role: role })
      });

      if (!res.ok) {
        console.error("Failed to update user role on backend", res.statusText);
        return false;
      }

      const { data: updatedDbUser } = await res.json();
      if (!updatedDbUser) return false;

      const updatedUser: User = {
        id: updatedDbUser.id,
        email: updatedDbUser.email,
        name: updatedDbUser.full_name,
        role: updatedDbUser.system_role as UserRole,
        avatar_url: updatedDbUser.avatar_url || undefined,
        created_at: updatedDbUser.created_at
      };

      set((state) => {
        const updatedUsers = state.allUsers.map((u) => u.id === userId ? updatedUser : u);
        const isSelf = state.currentUser?.id === userId;
        return {
          allUsers: updatedUsers,
          currentUser: isSelf ? updatedUser : state.currentUser,
          currentRole: isSelf ? updatedUser.role : state.currentRole
        };
      });

      return true;
    } catch (e) {
      console.error("Failed to update user role", e);
      return false;
    }
  },

  setSandboxMode: (enabled: boolean) => {
    localStorage.setItem('use_sandbox_mode', enabled ? 'true' : 'false');
    set({ isSandboxMode: enabled });
    if (enabled) {
      set({ allUsers: DEFAULT_SANDBOX_USERS });
      const storedUserId = localStorage.getItem('auth_user_id');
      if (storedUserId) {
        const user = DEFAULT_SANDBOX_USERS.find((u) => u.id === storedUserId);
        if (user) {
          set({ currentUser: user, currentRole: user.role });
        }
      }
    } else {
      set({ isInitialized: false, currentUser: null, currentRole: null });
      localStorage.removeItem('auth_user_id');
      get().initialize();
    }
  },
}));
