import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { Fraunces, Inter_Tight } from "next/font/google";
import "sonner/dist/styles.css";
import "./globals.css";
import "./modern-ui.css";
import { cn } from "@/lib/utils";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { QueryProvider } from "@/components/providers/query-provider";
import { Providers } from "@/components/providers/providers";
import { RecordRowNavigation } from "@/components/shared/record-row-navigation";
import { FieldFeedback } from "@/components/shared/field-feedback";
import { SonnerProvider } from "@/components/providers/sonner-provider";
import { BRAND_COLOR, SITE_DESCRIPTION, SITE_NAME, SITE_TITLE, absoluteUrl } from "@/lib/site";

import { PRIVATE_ROBOTS } from "@/lib/seo";

const inter = localFont({
  src: "../assets/fonts/inter-variable.ttf",
  weight: "100 900",
  variable: "--font-inter",
  display: "swap",
});

// Abide "Paper" display + body faces (used only inside [data-paper-root])
const fraunces = Fraunces({
  subsets: ["latin"],
  variable: "--font-fraunces",
  axes: ["opsz"],
  display: "swap",
});

const interTight = Inter_Tight({
  subsets: ["latin"],
  variable: "--font-inter-tight",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(absoluteUrl("/")),
  title: {
    default: SITE_TITLE,
    template: `%s | ${SITE_NAME}`,
  },
  description: SITE_DESCRIPTION,
  manifest: "/manifest.json",
  icons: {
    icon: [
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-64.png", sizes: "64x64", type: "image/png" },
      { url: "/favicon-128.png", sizes: "128x128", type: "image/png" },
      { url: "/favicon-256.png", sizes: "256x256", type: "image/png" },
      {
        url: "/brand/belivrhq-favicon-white.png",
        sizes: "1024x1024",
        type: "image/png",
      },
      { url: "/icons/icon-192x192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512x512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: "/icons/icon-192x192.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "BelivrHQ",
  },
  formatDetection: {
    telephone: false,
  },
  other: {
    "mobile-web-app-capable": "yes",
  },
  applicationName: SITE_NAME,
  category: "Church management software",
  referrer: "strict-origin-when-cross-origin",
  creator: SITE_NAME,
  publisher: SITE_NAME,
  robots: PRIVATE_ROBOTS,
  verification: {
    google: process.env.GOOGLE_SITE_VERIFICATION || undefined,
    other: process.env.BING_SITE_VERIFICATION
      ? { "msvalidate.01": process.env.BING_SITE_VERIFICATION }
      : undefined,
  },
};

export const viewport: Viewport = {
  themeColor: BRAND_COLOR,
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={cn(inter.variable, fraunces.variable, interTight.variable, "h-full antialiased")}
      suppressHydrationWarning
    >
      <body
        className="min-h-full flex flex-col bg-background text-foreground"
        style={{ fontFamily: "var(--font-inter), Inter, sans-serif" }}
      >
        {/* Pre-paint accent application: the stored Paper brand (if any) is
            resolved to <html> custom props before first paint; the pre-paint
            next-themes script above has already applied .dark. Values mirror
            src/lib/paper-brand.ts; PaperBrandSync re-applies after mount. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `try{for(var j=0;j<2;j++){var z=j?sessionStorage:localStorage;var ks=Object.keys(z);for(var i=0;i<ks.length;i++){var k=ks[i];if(/^churchos[:-]/.test(k)){var n=k.replace(/^churchos/,"belivrhq");if(z.getItem(n)===null)z.setItem(n,z.getItem(k))}}}var s=JSON.parse(localStorage.getItem("belivrhq:paper-brand")||"null");if(s){var d=document.documentElement.classList.contains("dark");var b=d?s.brandDark:s.brand;var st=document.documentElement.style;st.setProperty("--brand",b);st.setProperty("--brand-soft",d?s.softDark:s.soft);st.setProperty("--ring","color-mix(in oklab, "+b+" 40%, transparent)")}}catch(e){}`,
          }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <QueryProvider>
            <FieldFeedback />
            <RecordRowNavigation />
            <Providers>{children}</Providers>
            <SonnerProvider />
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
