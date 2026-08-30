export interface AuthenticatedUser {
  id: string;
  email: string;
  isEmailVerified: boolean;
}

export interface AuthenticatedBusinessContext {
  userId: string;
  businessId: string;
}

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    statusCode: number;
    details?: unknown;
  };
}
