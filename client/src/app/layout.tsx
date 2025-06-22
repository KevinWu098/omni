import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Toaster } from "@/components/ui/sonner";
import { NuqsAdapter } from "nuqs/adapters/next/app";

import "./globals.css";

import { AuthProvider } from "@/components/auth-provider";

const geistSans = Geist({
    variable: "--font-geist-sans",
    subsets: ["latin"],
});

const geistMono = Geist_Mono({
    variable: "--font-geist-mono",
    subsets: ["latin"],
});

export const metadata: Metadata = {
    title: "Omni",
    description: ":o",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en">
            <body
                className={`${geistSans.variable} ${geistMono.variable} antialiased`}
            >
                <AuthProvider>
                    <NuqsAdapter>
                        <div className="overflow-hidden bg-o-base-background">
                            <div className="w-full bg-o-header p-2">
                                <span
                                    className="tracking-tightest flex items-center text-sm font-semibold uppercase leading-none text-o-white"
                                    style={{
                                        fontVariationSettings:
                                            '"wght" 600, "wdth" 135',
                                    }}
                                >
                                    Omni
                                </span>
                            </div>
                            {children}
                        </div>

                        <Toaster richColors />
                    </NuqsAdapter>
                </AuthProvider>
            </body>
        </html>
    );
}
