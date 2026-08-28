export interface User {
  id: string;
  name: string;
  email: string;
  role: 'ADMIN' | 'CITIZEN' | 'SUPER_ADMIN';
}

export interface AuthResponse {
  user: User;
  token: string;
}
