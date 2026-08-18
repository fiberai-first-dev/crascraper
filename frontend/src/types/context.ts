export interface AppState {
  isLoggedIn: boolean;
  user: { id: string; email: string; name: string } | null;
  loading: boolean;
}
