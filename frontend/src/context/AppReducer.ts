import { AppState } from "@/types/context";
import { ActionType, AppAction } from "./AppActions";

export function AppReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case ActionType.LOGIN:
      return { ...state, isLoggedIn: true, user: action.payload || state.user };
    case ActionType.LOGOUT:
      return { ...state, isLoggedIn: false, user: null };
    case ActionType.SET_LOADING:
      return { ...state, loading: action.payload };
    case ActionType.SET_USER:
      return { ...state, user: action.payload, isLoggedIn: Boolean(action.payload) };
    default:
      return state;
  }
}
