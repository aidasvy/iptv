import type { Metadata } from "next";
import { SessionProvider } from "next-auth/react";
import "./globals.css";

export const metadata: Metadata = {
  title: "HoopManager — Basketball Management Game",
  description: "The most realistic basketball management game ever built.",
  openGraph: {
    title: "HoopManager",
    description: "Manage your franchise to glory.",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        <SessionProvider>
          {children}
        </SessionProvider>
      </body>
    </html>
  );
}
