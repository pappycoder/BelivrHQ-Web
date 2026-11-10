import type { BillingCycle, SubscriptionPlan } from "./billing";

export interface RegisterInput {
  termsAccepted?: boolean;
  acceptedTermsVersion?: string;
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
  churchName: string;
  denomination?: string;
  churchAddress?: string;
  plan?: Exclude<SubscriptionPlan, "enterprise">;
  billingCycle?: BillingCycle;
}

export interface LoginInput {
  email: string;
  password: string;
}

export interface ForgotPasswordInput {
  email: string;
}

export interface ResetPasswordInput {
  token: string;
  newPassword: string;
}

export interface RegisterResponse {
  /** Registration never establishes a workspace session. */
  sessionEstablished?: false;
  requiresEmailConfirmation?: boolean;
  userId: string;
  email: string;
  profileId: string;
  churchId: string;
  churchName: string;
  role: string;
}

export interface LoginResponse {
  sessionEstablished?: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt?: number;
  userId: string;
  email?: string;
  requiresTwoFactor?: boolean;
  twoFactorEmail?: string;
  challengeToken?: string;
  recoveryCodes?: string[];
  twoFactorMethod?: "authenticator" | "migration" | "supabase-migration";
  authenticatorSetup?: {
    factorId: string;
    qrCode: string;
    secret: string;
    uri: string;
  };
  profile?: {
    profileId: string;
    churchId: string;
    branchId?: string;
    role: string;
    firstName: string;
    lastName: string;
  };
}

export interface RefreshResponse {
  sessionEstablished: boolean;
  accessToken?: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface AuthUser {
  userId: string;
  email: string;
  profile?: LoginResponse["profile"];
}

export interface AuthError {
  code?: string;
  retryAfterSeconds?: number;
  details?: unknown;
  message: string;
  statusCode: number;
}
