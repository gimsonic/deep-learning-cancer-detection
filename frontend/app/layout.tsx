import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CurieSense AI — Cancer Detection System",
  description:
    "AI-powered multi-cancer detection. Upload a medical scan and receive an instant 2-stage analysis.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="light">
      <body className={inter.className}>
        <main>{children}</main>
      </body>
    </html>
  );
}