import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

export const metadata: Metadata = {
  title: "CommonGround - Co-parenting without the conflict",
  description: "AI-powered co-parenting platform that reduces conflict and helps families communicate effectively. Shared calendar, secure messaging, expense tracking, and court-ready documentation.",
  keywords: ["co-parenting", "custody", "family law", "shared calendar", "expense tracking", "ARIA"],
  authors: [{ name: "CommonGround" }],
  openGraph: {
    title: "CommonGround - Co-parenting without the conflict",
    description: "Find balance. Build peace. Together.",
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
          href="https://fonts.googleapis.com/css2?family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;0,9..40,700;1,9..40,400&family=Merriweather:ital,wght@0,300;0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
