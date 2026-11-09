import type { Metadata } from "next";
import { SupportContact } from "@/components/support/support-contact";

export const metadata: Metadata = {
  title: "Contact BelivrHQ Support",
  description: "Church administrators can contact BelivrHQ Support through the in-app live chat.",
  robots: { index: false, follow: true },
};

export default function ContactSupportPage() {
  return <SupportContact />;
}
