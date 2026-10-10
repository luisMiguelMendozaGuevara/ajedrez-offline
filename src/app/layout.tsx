import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
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

export const metadata: Metadata = {
  title: "Ajedrez Móvil - Gratis | vs Máquina y Multijugador Offline",
  description: "Juega ajedrez gratis en tu móvil contra la máquina con IA o con un amigo en modo multijugador offline. Sin registro, funciona sin conexión.",
  keywords: ["ajedrez", "chess", "gratis", "móvil", "android", "iOS", "IA", "multijugador", "offline", "juego"],
  authors: [{ name: "Ajedrez Móvil" }],
  openGraph: {
    title: "Ajedrez Móvil Gratis",
    description: "Ajedrez gratis para móvil: juega contra la máquina o con un amigo offline.",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Ajedrez Móvil Gratis",
    description: "Ajedrez gratis para móvil: juega contra la máquina o con un amigo offline.",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: "#10b981",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
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
