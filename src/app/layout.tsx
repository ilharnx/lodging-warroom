import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Lodging War Room",
  description: "Compare vacation rental listings with your crew",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
