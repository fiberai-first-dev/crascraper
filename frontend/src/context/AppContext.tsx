import { createContext } from "react";
import { AppState } from "@/types/context";
import { User } from "@/types";

export interface AppContextType {
  state: AppState;
  login: (user: User) => void;
  logout: () => void;
  setUser: (user: User | null) => void;
}

export const AppContext = createContext<AppContextType | null>(null);
