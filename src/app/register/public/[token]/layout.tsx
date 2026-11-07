import { PRIVATE_ROBOTS } from "@/lib/seo";
export const metadata = {
  title: "Church registration",
  robots: PRIVATE_ROBOTS,
};
export default function RegistrationLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
