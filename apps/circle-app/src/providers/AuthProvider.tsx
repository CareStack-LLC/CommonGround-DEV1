import {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  ReactNode,
} from "react";
import * as SecureStore from "expo-secure-store";

interface User {
  id: string;
  email: string;
  name: string;
  avatar_url?: string;
  relationship?: string;
}

interface ConnectedChild {
  id: string;
  name: string;
  avatar_url?: string;
  age: number;
  is_online: boolean;
  family_file_id: string;
}

interface AuthContextType {
  user: User | null;
  connectedChildren: ConnectedChild[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  register: (name: string, email: string, password: string) => Promise<boolean>;
  logout: () => Promise<void>;
  refreshChildren: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const TOKEN_KEY = "circle_auth_token";
const USER_KEY = "circle_user";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [connectedChildren, setConnectedChildren] = useState<ConnectedChild[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    loadStoredAuth();
  }, []);

  const loadStoredAuth = async () => {
    try {
      const [token, storedUser] = await Promise.all([
        SecureStore.getItemAsync(TOKEN_KEY),
        SecureStore.getItemAsync(USER_KEY),
      ]);

      if (token && storedUser) {
        const parsedUser = JSON.parse(storedUser);
        setUser(parsedUser);
        await fetchConnectedChildren(token);
      }
    } catch (error) {
      console.error("Failed to load auth:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConnectedChildren = async (token: string) => {
    try {
      // In real app, this would call the API
      // const response = await apiClient.getConnectedChildren(token);
      // setConnectedChildren(response.data);

      // Demo data for now
      setConnectedChildren([
        {
          id: "child-1",
          name: "Emma",
          avatar_url: undefined,
          age: 8,
          is_online: true,
          family_file_id: "ff-1",
        },
        {
          id: "child-2",
          name: "Lucas",
          avatar_url: undefined,
          age: 6,
          is_online: false,
          family_file_id: "ff-1",
        },
      ]);
    } catch (error) {
      console.error("Failed to fetch children:", error);
    }
  };

  const login = useCallback(async (email: string, password: string): Promise<boolean> => {
    try {
      setIsLoading(true);

      // In real app, this would call the API
      // const response = await apiClient.circleLogin({ email, password });

      // Demo login
      if (email && password.length >= 6) {
        const demoUser: User = {
          id: "circle-user-1",
          email,
          name: email.split("@")[0],
          relationship: "Grandparent",
        };

        const demoToken = "demo-circle-token";

        await Promise.all([
          SecureStore.setItemAsync(TOKEN_KEY, demoToken),
          SecureStore.setItemAsync(USER_KEY, JSON.stringify(demoUser)),
        ]);

        setUser(demoUser);
        await fetchConnectedChildren(demoToken);
        return true;
      }

      return false;
    } catch (error) {
      console.error("Login failed:", error);
      return false;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const register = useCallback(
    async (name: string, email: string, password: string): Promise<boolean> => {
      try {
        setIsLoading(true);

        // In real app, this would call the API
        // const response = await apiClient.circleRegister({ name, email, password });

        // Demo registration
        if (name && email && password.length >= 6) {
          const demoUser: User = {
            id: "circle-user-new",
            email,
            name,
            relationship: undefined,
          };

          const demoToken = "demo-circle-token-new";

          await Promise.all([
            SecureStore.setItemAsync(TOKEN_KEY, demoToken),
            SecureStore.setItemAsync(USER_KEY, JSON.stringify(demoUser)),
          ]);

          setUser(demoUser);
          return true;
        }

        return false;
      } catch (error) {
        console.error("Registration failed:", error);
        return false;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const logout = useCallback(async () => {
    try {
      await Promise.all([
        SecureStore.deleteItemAsync(TOKEN_KEY),
        SecureStore.deleteItemAsync(USER_KEY),
      ]);
      setUser(null);
      setConnectedChildren([]);
    } catch (error) {
      console.error("Logout failed:", error);
    }
  }, []);

  const refreshChildren = useCallback(async () => {
    const token = await SecureStore.getItemAsync(TOKEN_KEY);
    if (token) {
      await fetchConnectedChildren(token);
    }
  }, []);

  return (
    <AuthContext.Provider
      value={{
        user,
        connectedChildren,
        isLoading,
        isAuthenticated: !!user,
        login,
        register,
        logout,
        refreshChildren,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
