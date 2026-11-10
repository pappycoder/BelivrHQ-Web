import { type NextRequest, NextResponse } from "next/server";
import { trustedBrowserRequest } from "@/lib/server-session";
import { expireRegistrationCheckout } from "@/lib/registration-checkout-session";
export function DELETE(request: NextRequest) {
  if (!trustedBrowserRequest(request))
    return new NextResponse(null, { status: 403 });
  const response = new NextResponse(null, {
    status: 204,
    headers: { "Cache-Control": "no-store" },
  });
  expireRegistrationCheckout(response);
  return response;
}
