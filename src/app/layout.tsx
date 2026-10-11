import type { Metadata, Viewport } from "next";
import { EB_Garamond, Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as SonnerToaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const garamond = EB_Garamond({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["500", "600", "700"],
});

export const metadata: Metadata = {
  title: "Ajedrez Offline - Gratis | vs Máquina y 2 Jugadores",
  description: "Juega ajedrez gratis sin conexión: contra la máquina con IA o con un amigo en la misma pantalla. Sin registro, funciona offline.",
  keywords: ["ajedrez", "chess", "gratis", "offline", "móvil", "android", "iOS", "IA", "2 jugadores", "juego"],
  authors: [{ name: "Ajedrez Offline" }],
  openGraph: {
    title: "Ajedrez Offline",
    description: "Ajedrez gratis sin conexión: juega contra la máquina o con un amigo en la misma pantalla.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ajedrez Offline",
    description: "Ajedrez gratis sin conexión: juega contra la máquina o con un amigo en la misma pantalla.",
  },
  icons: {
    icon: "/logo.svg",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#F1E6D0",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${garamond.variable} antialiased bg-background text-foreground paper-grain`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster />
          <SonnerToaster position="top-center" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
