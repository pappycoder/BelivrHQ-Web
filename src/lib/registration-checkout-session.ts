import "server-only";
import { type NextRequest, NextResponse } from "next/server";
export const REGISTRATION_COOKIE = "belivrhq_registration_checkout";
export function registrationCredential(request: Pick<NextRequest, "cookies">) {
  return request.cookies.get(REGISTRATION_COOKIE)?.value;
}
export function saveRegistrationCheckout(
  response: NextResponse,
  token: string,
) {
  response.cookies.set(REGISTRATION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 86400,
  });
}
export function expireRegistrationCheckout(response: NextResponse) {
  response.cookies.set(REGISTRATION_COOKIE, "", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 0,
  });
}
export const isRegistrationBillingPath = (path: string) =>
  /^billing\/registration\/(?:subscription|quote|checkout|verify|checkout\/close)$/.test(
    path,
  );
