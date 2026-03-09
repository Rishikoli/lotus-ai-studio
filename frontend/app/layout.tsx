import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
    title: "Lotus AI Studio — Cinematic Story Engine",
    description: "AI-powered multi-agent graphic novel studio. Generate cinematic stories with a full pre-production pipeline.",
    keywords: ["AI story generator", "graphic novel", "multi-agent AI", "cinematic AI"],
    authors: [{ name: "Lotus AI" }],
    openGraph: {
        title: "Lotus AI Studio",
        description: "Generate cinematic stories with an 8-agent AI pipeline",
        type: "website",
    },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body>
                {/* Film grain noise overlay — always present */}
                <div className="noise-overlay" aria-hidden="true" />
                {children}
            </body>
        </html>
    );
}
