import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Stay",
  description: "Compare vacation rental listings with your crew",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
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
        {/* Topographic contour lines — behind all content */}
        <div className="topo-bg" aria-hidden="true">
          <svg viewBox="0 0 300 300" preserveAspectRatio="xMidYMid slice" fill="none" xmlns="http://www.w3.org/2000/svg">
            <g stroke="#B8A48E" strokeWidth="0.8" strokeLinecap="round" opacity="0.05">
              {/* Outer contours */}
              <path d="M-20 35c40-12 80 8 130-2s70-18 110 5 60 10 100-5" />
              <path d="M-20 70c35 15 75-10 115 8s65 20 105-5 55-8 95 12" />
              <path d="M-20 108c50-8 90 18 125 2s45-22 85 0 60 15 105-8" />
              {/* Mid contours — denser */}
              <path d="M-20 140c30 10 55-12 90 5s50 15 85-8 65-10 100 8 45 12 65-3" />
              <path d="M-20 168c45-5 70 14 100 0s40-16 75 6 55 12 90-4 50-8 75 10" />
              <path d="M-20 195c25 8 60-8 95 4s55 10 80-6 40-12 70 5 50 8 80-2" />
              {/* Inner ring contours */}
              <path d="M30 212c35-10 65 8 95-2s50 12 80-4 45-8 75 6" />
              <path d="M55 238c30 6 50-10 75 3s40 8 65-5 50-6 70 8" />
              <path d="M80 258c25-5 45 8 65-2s35 6 55-3 40-4 55 5" />
              {/* Secondary elevation cluster */}
              <path d="M-20 15c55 8 100-5 145 10s80 5 120-8 55 3 75 10" />
              <path d="M-10 280c40-8 85 10 130-5s60 8 100-3" />
              <path d="M10 300c45 5 80-12 120 4s65 10 95-6 50-4 80 8" />
              <path d="M-20 320c35-6 70 10 110-3s55 8 95-5 60 3 80 10" />
            </g>
          </svg>
        </div>
        {children}
      </body>
    </html>
  );
}
