import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";
import { SubscriptionProvider } from "@/contexts/subscription-context";
import { NotificationProvider } from "@/contexts/notification-context";
import { WebSocketProvider } from "@/contexts/websocket-context";
import { RealtimeProvider } from "@/contexts/realtime-context";
import { ServiceWorkerRegister } from "@/components/service-worker-register";
import { PortalWrapper } from "@/components/portal-wrapper";
import { IncomingCallNotification } from "@/components/incoming-call-notification";
import {
  DM_Sans,
  DM_Serif_Display,
  Inter,
  Space_Grotesk,
  JetBrains_Mono,
} from "next/font/google";

/* ── Self-hosted Google Fonts via next/font ────────────────────────────
 * Eliminates render-blocking <link> to fonts.googleapis.com.
 * Each font is subset to latin, loaded with font-display:swap,
 * and served from the same origin as the page.
 * ------------------------------------------------------------------- */

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-dm-sans",
});

const dmSerifDisplay = DM_Serif_Display({
  subsets: ["latin"],
  weight: ["400"],
  style: ["normal", "italic"],
  display: "swap",
  variable: "--font-dm-serif-display",
});

const inter = Inter({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-inter",
});

const spaceGrotesk = Space_Grotesk({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  display: "swap",
  variable: "--font-space-grotesk",
});

const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "CommonGround | The Calm Way to Co-Parent",
  description: "Free co-parenting app with AI-powered messaging, shared custody calendar, expense tracking, and court-ready documentation. Peaceful tools that put your children first.",
  keywords: ["co-parenting", "co-parenting app", "free co-parenting app", "custody calendar", "co-parenting communication", "child custody app", "shared parenting", "court-ready records", "ARIA", "family law", "expense tracking"],
  authors: [{ name: "CommonGround" }],
  openGraph: {
    title: "CommonGround | The Calm Way to Co-Parent",
    description: "Free co-parenting tools with AI-powered messaging, shared calendar, and court-ready documentation. Built by parents, for parents.",
    type: "website",
  },
  twitter: {
    card: "summary",
    title: "CommonGround | The Calm Way to Co-Parent",
    description: "Peaceful co-parenting tools that put your children first.",
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
      className={`${dmSans.variable} ${dmSerifDisplay.variable} ${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable}`}
    >
      <head>
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
        <ServiceWorkerRegister />
        <AuthProvider>
          <SubscriptionProvider>
            <WebSocketProvider>
              <RealtimeProvider>
                <NotificationProvider>
                  <IncomingCallNotification />
                  <PortalWrapper>
                    {children}
                  </PortalWrapper>
                </NotificationProvider>
              </RealtimeProvider>
            </WebSocketProvider>
          </SubscriptionProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
