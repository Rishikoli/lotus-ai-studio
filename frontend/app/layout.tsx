import type { Metadata } from "next";
import "./globals.css";
import LightRays from "./components/LightRays";

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
            <body style={{ margin: 0, padding: 0, background: "var(--bg-void)" }}>
                {/* Global Background Effects layer */}
                <div style={{ position: "fixed", inset: 0, zIndex: 0, pointerEvents: "none", overflow: "hidden" }}>
                    <LightRays
                        raysOrigin="top-center"
                        raysColor="#E8D48B" // Brighter gold
                        raysSpeed={0.6}
                        lightSpread={1.6}
                        rayLength={2.0}
                        pulsating={true}
                        opacity={0.8}
                    />
                </div>

                {/* Film grain noise overlay — always present */}
                <div className="noise-overlay" aria-hidden="true" style={{ zIndex: 9999 }} />

                {/* Main Content Layer */}
                <div style={{ position: "relative", zIndex: 1, minHeight: "100vh" }}>
                    {children}
                </div>
            </body>
        </html>
    );
}
