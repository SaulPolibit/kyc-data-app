export class AuthError extends Error {
  constructor(
    message: string,
    public code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'UNVERIFIED'
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

export type AuthResult<T> =
  | { success: true; data: T }
  | { success: false; error: string; code: string };
