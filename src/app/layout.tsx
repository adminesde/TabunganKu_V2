import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme-provider";
import ToastProvider from "@/components/common/ToastProvider";
import { SessionContextProvider } from "@/components/session-context-provider"; // Import SessionContextProvider

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Tabungan Siswa Digital",
  description: "Aplikasi Tabungan Siswa Digital SDN Dukuhwaru 01",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <ToastProvider>
            {/* SessionContextProvider will now handle the main layout and routing */}
            <SessionContextProvider>{children}</SessionContextProvider>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}