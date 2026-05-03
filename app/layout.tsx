import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Knock — early access",
  description: "Cold outreach from your own Gmail, without two people emailing the same person. Join the waitlist.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="antialiased">{children}</body>
    </html>
  );
}
