/** Update this single source when the company's designated contact changes. */
export const LEGAL_COMPANY = {
  name: "PappyCoder Technologies Limited",
  product: "BelivrHQ",
  country: "Nigeria",
  email: "lucasdeekay98@gmail.com",
} as const;

export const LEGAL_VERSION = "2026-10-24";
export const LEGAL_DATE = "24 October 2026";
export const LEGAL_CONTACT_HREF = `mailto:${LEGAL_COMPANY.email}`;
export const LEGAL_LINKS = [
  { href: "/privacy-policy", label: "Privacy Policy" },
  { href: "/terms-of-service", label: "Terms of Service" },
  { href: "/terms-and-conditions", label: "Terms and Conditions" },
] as const;
