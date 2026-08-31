import type { Metadata } from "next";
import "./globals.css";
import { RealEstateAgentSchema } from "@/components/seo/RealEstateSchema";

export const metadata: Metadata = {
  title: "One Stop Property Solutions | #1 Real Estate Agent in Kamothe Navi Mumbai",
  description: "Top-rated real estate agency and property consultants in Sector 21, Kamothe, Navi Mumbai. Specializing in 1BHK, 2BHK, 3BHK resale flats, commercial shops, CIDCO transfer properties, and home loan documentation near Khandeshwar Station. Call +91-9845260285.",
  keywords: [
    "Real Estate Agent in Kamothe",
    "Top Property Consultant Navi Mumbai",
    "1 BHK flat in Kamothe",
    "2 BHK flat in Kamothe Sector 21",
    "Resale flats in Kamothe",
    "Properties near Khandeshwar Station",
    "CIDCO transfer property consultant",
    "One Stop Property Solutions Kamothe",
    "Commercial shop for sale in Kamothe"
  ],
  authors: [{ name: "One Stop Property Solutions" }],
  openGraph: {
    title: "One Stop Property Solutions | Best Real Estate Agent in Kamothe Navi Mumbai",
    description: "Top-rated property consultants in Kamothe Sector 21 near Khandeshwar Station. 10+ years experience in residential resales, rentals, CIDCO documentation, and commercial properties.",
    url: "https://onestoppropertysolution.in",
    siteName: "One Stop Property Solutions",
    locale: "en_IN",
    type: "website",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
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
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap" 
          rel="stylesheet" 
        />
        <RealEstateAgentSchema />
      </head>
      <body className="font-sans antialiased bg-[#0a0a0a] text-[#ededed]">
        {children}
      </body>
    </html>
  );
}
