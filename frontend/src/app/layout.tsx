import type { Metadata } from "next";
import { Noto_Sans, Outfit } from "next/font/google";
import "./globals.css";
import Navbar from "@/components/layout/Navbar";
import Footer from "@/components/layout/Footer";
import { ThemeProvider } from "@/context/ThemeContext";

const notoSans = Noto_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  variable: "--font-noto-sans",
  display: "swap",
});

const outfit = Outfit({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-numbers",
  display: "swap",
});

export const metadata: Metadata = {
  title: "AirIndex India — Real-Time Indian Airfare Price Index",
  description:
    "High-frequency domestic airfare inflation monitoring platform under Ministry of Statistics and Programme Implementation (MoSPI) / NSO CPI methodology.",
  icons: {
    icon: "/mospi_logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`h-full antialiased dark ${notoSans.variable} ${outfit.variable}`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-sans app-bg-primary app-text-primary transition-colors duration-200 selection:bg-[var(--color-gold-bg)] selection:text-[var(--color-gold)]">
        <ThemeProvider>
          <Navbar />
          <main className="flex-1 pb-16">{children}</main>
          <Footer />
        </ThemeProvider>
      </body>
    </html>
  );
}
