import { ReactNode, useReducer } from "react";
import { AppContext } from "./AppContext";
import { AppReducer } from "./AppReducer";
import { ActionType } from "./AppActions";
import { clearSession, getStoredUser, getToken } from "@/features/auth/auth.utils";
import { User } from "@/types";

const initialState = () => ({
  isLoggedIn: Boolean(getToken()),
  user: getStoredUser<User>(),
  loading: false,
});

export function AppProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(AppReducer, undefined, initialState);

  function login(user: User) {
    dispatch({ type: ActionType.LOGIN, payload: user });
  }

  function logout() {
    clearSession();
    dispatch({ type: ActionType.LOGOUT });
  }

  function setUser(user: User | null) {
    dispatch({ type: ActionType.SET_USER, payload: user });
  }

  return (
    <AppContext.Provider value={{ state, login, logout, setUser }}>
      {children}
    </AppContext.Provider>
  );
}

export default AppProvider;
