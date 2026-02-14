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
        {/* Ambient topographic contour lines — Cosmos-inspired */}
        <div className="topo-ambient" aria-hidden="true">
          <svg viewBox="0 0 3200 900" preserveAspectRatio="none" fill="none" stroke="#2A2520" strokeWidth="1.2" strokeLinecap="round">
            <g>
              <path d="M-100 80C200 55 350 120 550 85S900 105 1100 78S1500 95 1700 70" />
              <path d="M-100 190C150 155 320 215 520 180S880 145 1080 195S1450 170 1700 160" />
              <path d="M-100 270C100 245 380 310 550 275S850 235 1050 280S1500 260 1700 250" />
              <path d="M-100 320C130 298 280 348 480 315S860 340 1050 318S1420 330 1700 308" />
              <path d="M-100 365C110 342 310 395 510 362S870 378 1060 355S1440 375 1700 348" />
              <path d="M-100 490C180 458 340 520 540 488S920 455 1120 498S1480 475 1700 465" />
              <path d="M-100 550C120 518 290 575 490 545S870 510 1070 558S1430 535 1700 525" />
              <path d="M-100 615C160 588 330 640 530 610S890 590 1090 622S1460 605 1700 592" />
              <path d="M-100 720C140 688 300 740 500 710S880 675 1080 720S1440 700 1700 690" />
              <path d="M-100 830C100 798 280 855 480 825S860 795 1060 838S1440 820 1700 808" />
            </g>
            {/* Duplicate offset for seamless loop */}
            <g transform="translate(1600, 0)">
              <path d="M-100 80C200 55 350 120 550 85S900 105 1100 78S1500 95 1700 70" />
              <path d="M-100 190C150 155 320 215 520 180S880 145 1080 195S1450 170 1700 160" />
              <path d="M-100 270C100 245 380 310 550 275S850 235 1050 280S1500 260 1700 250" />
              <path d="M-100 320C130 298 280 348 480 315S860 340 1050 318S1420 330 1700 308" />
              <path d="M-100 365C110 342 310 395 510 362S870 378 1060 355S1440 375 1700 348" />
              <path d="M-100 490C180 458 340 520 540 488S920 455 1120 498S1480 475 1700 465" />
              <path d="M-100 550C120 518 290 575 490 545S870 510 1070 558S1430 535 1700 525" />
              <path d="M-100 615C160 588 330 640 530 610S890 590 1090 622S1460 605 1700 592" />
              <path d="M-100 720C140 688 300 740 500 710S880 675 1080 720S1440 700 1700 690" />
              <path d="M-100 830C100 798 280 855 480 825S860 795 1060 838S1440 820 1700 808" />
            </g>
          </svg>
        </div>
        {children}
      </body>
    </html>
  );
}
