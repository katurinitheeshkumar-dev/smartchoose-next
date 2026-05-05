import type { Metadata } from "next";
import { Outfit } from "next/font/google";
import "./globals.css";
import ClientLayout from "./ClientLayout";

const outfit = Outfit({ 
  subsets: ["latin"],
  display: 'swap',
  variable: '--font-outfit',
});

export const metadata: Metadata = {
  metadataBase: new URL("https://www.smartchoose.in"),
  title: "SmartChoose - Premium Product Discovery",
  description: "Discover Premium Products | Compare & Shop Smart",
  icons: {
    icon: [
      { url: '/logo.png' },
      { url: '/favicon.ico', sizes: 'any' }
    ],
    apple: '/apple-touch-icon.png',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={outfit.variable}>
      <body className={`${outfit.className} min-h-screen bg-slate-50 flex flex-col antialiased`}>
        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}

