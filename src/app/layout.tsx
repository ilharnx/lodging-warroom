import type { Metadata, Viewport } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stay",
  description: "Compare vacation rental listings with your crew",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600;9..144,700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="antialiased">
        {/* Topographic contour rings — behind all content */}
        <div className="topo-bg" aria-hidden="true">
          <svg viewBox="0 0 800 800" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Primary elevation cluster — upper-right */}
            <g stroke="#B8A48E" strokeWidth="0.8" strokeLinecap="round" opacity="0.05">
              <path d="M520 180c-30 20-80 10-110 40s-20 70 10 100 80 30 120 10 50-60 30-100-20-70-50-50" />
              <path d="M530 200c-25 15-65 5-90 30s-15 55 10 80 65 25 95 8 40-48 24-80-16-55-39-38" />
              <path d="M538 218c-20 12-50 2-70 22s-10 42 8 62 50 20 72 6 30-38 18-62-12-42-28-28" />
              <path d="M544 234c-14 8-36 0-50 15s-6 30 6 45 36 14 52 4 22-28 13-45-8-30-21-19" />
              <path d="M548 248c-8 5-22-2-32 10s-3 20 5 30 24 10 34 3 14-18 8-30-6-20-15-13" />
            </g>
            {/* Secondary cluster — lower-left */}
            <g stroke="#B8A48E" strokeWidth="0.8" strokeLinecap="round" opacity="0.045">
              <path d="M180 520c35-25 95-15 130-50s25-85-15-120-95-35-140-12-60 72-35 120 25 85 60 62" />
              <path d="M195 505c28-20 75-10 105-38s18-65-12-95-75-28-110-10-48 56-28 94 20 68 45 49" />
              <path d="M208 490c22-15 58-6 82-28s12-48-10-72-58-22-84-8-36 42-22-72 15-52 34-36" />
              <path d="M220 478c16-10 42-3 60-20s8-35-8-52-42-16-60-6-26 30-16 52 10-38 24-26" />
              <path d="M230 468c10-6 28 0 40-12s4-22-6-34-28-10-40-4-16 20-10 34 6 24 16 16" />
            </g>
            {/* Tertiary cluster — mid-center, subtle */}
            <g stroke="#B8A48E" strokeWidth="0.6" strokeLinecap="round" opacity="0.035">
              <path d="M380 380c-20 15-55 8-78 30s-14 50 8 72 55 22 80 8 36-42 22-72-14-52-32-38" />
              <path d="M388 395c-14 10-40 5-56 20s-8 35 6 52 40 16 58 6 26-30 16-52-10-38-24-26" />
              <path d="M394 408c-8 6-25 2-36 12s-4 22 5 32 25 10 36 4 16-18 10-32-6-24-15-16" />
            </g>
            {/* Flowing horizontal contour lines — spanning width */}
            <g stroke="#B8A48E" strokeWidth="0.6" strokeLinecap="round" opacity="0.04">
              <path d="M-20 100c80-15 160 20 260-5s120-30 180 10 100 15 200-10" />
              <path d="M-20 300c60 18 140-12 220 8s100 22 160-8 80-12 140 14 100 10 140-6" />
              <path d="M-20 500c70-10 130 15 200 0s90-20 150 8 80 14 120-5 70-10 100 8" />
              <path d="M-20 680c50 12 110-8 180 6s80 15 140-10 90-8 130 12 80 6 120-8" />
            </g>
          </svg>
        </div>
        {children}
      </body>
    </html>
  );
}
