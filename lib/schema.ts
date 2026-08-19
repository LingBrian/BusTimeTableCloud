export interface Station {
  id: string;
  name: string;
  city: string;
  createdAt: number;
}

export interface Route {
  id: string;
  stationId: string;
  name: string;
  from: string;
  to: string;
  enabled: boolean;
  createdAt: number;
}

export interface Schedule {
  routeId: string;
  time: string;
  note: string;
  enabled: boolean;
}

export interface User {
  username: string;
  passwordHash: string;
  role: "admin" | "editor";
  createdAt: number;
}

export interface Setting {
  key: string;
  value: string;
}

export interface ApiResponse<T = unknown> {
  ok: boolean;
  data: T | null;
  error: ApiError | null;
}

export interface ApiError {
  code: string;
  message: string;
}
