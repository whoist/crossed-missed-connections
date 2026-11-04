import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  referrer: "no-referrer",
  title: "Crossed — A second chance at hello",
  description:
    "For the person you passed, the moment you remember, and the hello you didn't say. Missed connections across the United States.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
