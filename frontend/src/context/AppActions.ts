export enum ActionType {
  LOGIN = "LOGIN",
  LOGOUT = "LOGOUT",
  SET_LOADING = "SET_LOADING",
  SET_USER = "SET_USER",
}

export type AppAction =
  | { type: ActionType.LOGIN; payload?: { id: string; email: string; name: string } }
  | { type: ActionType.LOGOUT }
  | { type: ActionType.SET_LOADING; payload: boolean }
  | { type: ActionType.SET_USER; payload: { id: string; email: string; name: string } | null };
