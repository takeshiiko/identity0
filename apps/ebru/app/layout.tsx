import type { Metadata } from "next";
import "./globals.css";
import AudioPlayer from "@/components/AudioPlayer";
import CustomCursor from "@/components/CustomCursor";

export const metadata: Metadata = {
  title: "DERVISH — Turkish Marbling Art NFT Collection",
  description:
    "A special NFT collection on Ethereum inspired by 500 years of Turkish ebru marbling art.",
  keywords: ["Dervish", "NFT", "Ethereum", "Turkish Art", "Marbling", "Web3"],
  openGraph: {
    title: "DERVISH NFT Collection",
    description: "The digital touch of Turkish ebru art.",
    type: "website",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      </head>
      <body id="top" className="bg-ebru-bg antialiased">
        <CustomCursor />
        <main>{children}</main>
        <AudioPlayer />
      </body>
    </html>
  );
}
