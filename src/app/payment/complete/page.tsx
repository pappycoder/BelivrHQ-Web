import { PRIVATE_ROBOTS } from "@/lib/seo";
export const metadata = { title: "Payment confirmation", robots: PRIVATE_ROBOTS };
import { PaymentStateCard } from "@/components/billing/payment-state-card";
import Link from "next/link";
import { PublicPaperShell } from "@/components/shared/public-paper-shell";
export default function PaymentCompletePage() {
  return <PublicPaperShell><div className="mx-auto flex min-h-[60vh] max-w-lg flex-col justify-center gap-5 px-6 py-12">
    <h1 className="sr-only">Payment confirmation</h1>
    <PaymentStateCard outcome="pending" />
    <Link href="/login" className="font-medium text-primary underline">Return to BelivrHQ</Link>
  </div></PublicPaperShell>;
}
