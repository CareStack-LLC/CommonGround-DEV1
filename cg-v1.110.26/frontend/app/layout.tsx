import type { Metadata, Viewport } from "next";
import dynamic from "next/dynamic";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import {
  DM_Sans,
  DM_Serif_Display,
  Inter,
  Space_Grotesk,
  DM_Mono,
} from "next/font/google";

/* ── Lazy-loaded client components ─────────────────────────────────
 * Heavy providers (WebSocket, Realtime, Notification, Subscription)
 * and non-critical client components are loaded dynamically so their
 * JS doesn't block the initial render of marketing pages.
 * ------------------------------------------------------------------- */
const AppProviders = dynamic(
  () => import("@/components/app-providers"),
  { ssr: true },
);

/* ── Self-hosted Google Fonts via next/font ────────────────────────────
 * Eliminates render-blocking <link> to fonts.googleapis.com.
 * Each font is subset to latin, loaded with font-display:swap,
 * and served from the same origin as the page.
 * ------------------------------------------------------------------- */

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-dm-sans",
  preload: true,
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  display: "swap",
  variable: "--font-dm-serif-display",
  preload: true,
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
  preload: false,
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-space-grotesk",
  preload: false,
});

const dmMono = DM_Mono({
  subsets: ["latin"],
  weight: ["400", "500"],
  display: "swap",
  variable: "--font-dm-mono",
  preload: false,
});

/* ── Viewport — required for mobile PageSpeed ─────────────────────── */
export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  // Extend under the notch / home indicator so env(safe-area-inset-*) works and
  // the installed app feels edge-to-edge native.
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#F4F8F7" },
    { media: "(prefers-color-scheme: dark)", color: "#1E3A4A" },
  ],
};

export const metadata: Metadata = {
  title: "CommonGround | The Calm Way to Co-Parent",
  description: "Free co-parenting app with AI-powered messaging, shared custody calendar, expense tracking, and court-ready documentation. Peaceful tools that put your children first.",
  keywords: ["co-parenting", "co-parenting app", "free co-parenting app", "custody calendar", "co-parenting communication", "child custody app", "shared parenting", "court-ready records", "ARIA", "family law", "expense tracking"],
  authors: [{ name: "CommonGround" }],
  metadataBase: new URL("https://www.find-commonground.com"),
  applicationName: "CommonGround",
  // PWA: links the web app manifest and configures the iOS standalone shell so
  // "Add to Home Screen" launches full-screen with the right title + status bar.
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    title: "CommonGround",
    statusBarStyle: "default",
  },
  // Next emits the modern `mobile-web-app-capable`, but iOS Safari still needs
  // the legacy apple meta to launch full-screen from the home screen.
  other: {
    "apple-mobile-web-app-capable": "yes",
  },
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/icon.svg", type: "image/svg+xml" },
    ],
    apple: "/apple-icon.png",
  },
  openGraph: {
    title: "CommonGround | The Calm Way to Co-Parent",
    description: "Free co-parenting tools with AI-powered messaging, shared calendar, and court-ready documentation. Built by parents, for parents.",
    type: "website",
    siteName: "CommonGround",
  },
  twitter: {
    card: "summary",
    title: "CommonGround | The Calm Way to Co-Parent",
    description: "Peaceful co-parenting tools that put your children first.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${dmSans.variable} ${dmSerifDisplay.variable} ${inter.variable} ${spaceGrotesk.variable} ${dmMono.variable}`}
    >
      <head>
        {/* Google Analytics (gtag.js) — G-Y3BC0JNN56 */}
        <script async src="https://www.googletagmanager.com/gtag/js?id=G-Y3BC0JNN56" />
        <script
          dangerouslySetInnerHTML={{
            __html: `
              window.dataLayer = window.dataLayer || [];
              function gtag(){dataLayer.push(arguments);}
              gtag('js', new Date());
              gtag('config', 'G-Y3BC0JNN56');
            `,
          }}
        />
        {/* Dark mode detection */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var pref = localStorage.getItem('cg_theme_preference');
                  if (pref === 'dark' || (!pref && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
                    document.documentElement.classList.add('dark');
                  }
                } catch(e) {}
              })();
            `,
          }}
        />
      </head>
      <body className="antialiased">
        <AuthProvider>
          <AppProviders>
            {children}
          </AppProviders>
        </AuthProvider>
      </body>
    </html>
  );
}
