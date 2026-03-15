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

export const metadata: Metadata = {
  title: "CommonGround - Co-parenting, reimagined",
  description: "AI-powered co-parenting platform with shared calendar, secure messaging, expense tracking, and court-ready documentation. The calm way to co-parent.",
  keywords: ["co-parenting", "custody", "family law", "shared calendar", "expense tracking", "ARIA"],
  authors: [{ name: "CommonGround" }],
  openGraph: {
    title: "CommonGround - Co-parenting, reimagined",
    description: "Peaceful co-parenting tools that put children first.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=DM+Serif+Display:ital@0;1&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&family=Inter:wght@300;400;500;600;700&family=Space+Grotesk:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
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
