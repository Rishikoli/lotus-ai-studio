"use client";

import { useEffect, useState } from "react";
import {
    collection,
    query,
    where,
    orderBy,
    limit,
    onSnapshot
} from "firebase/firestore";
import { db } from "../../lib/firebase";
import Navbar from "../components/Navbar";
import StoryCard from "../components/StoryCard";
import type { StoryCommit } from "../types";
import { motion, AnimatePresence } from "motion/react";
import {
    ArrowLeft01Icon,
    Sorting01Icon,
    SearchList01Icon as Search01Icon,
    HourglassIcon
} from "hugeicons-react";
import { useRouter } from "next/navigation";
import { useAuth } from "../hooks/useAuth";

export default function GalleryPage() {
    const { user, loading: authLoading } = useAuth();
    const [stories, setStories] = useState<StoryCommit[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState("");
    const router = useRouter();

    useEffect(() => {
        if (authLoading) return;
        
        if (!user) {
            setStories([]);
            setLoading(false);
            return;
        }

        const q = query(
            collection(db, "commits"),
            where("user_id", "==", user.uid),
            orderBy("created_at", "desc"),
            limit(50)
        );

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const items = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                created_at: doc.data().created_at?.toDate() || new Date(),
            } as StoryCommit));

            setStories(items);
            setLoading(false);
        }, (err) => {
            console.error("Gallery Sync Error:", err);
            setLoading(false);
        });

        return () => unsubscribe();
    }, [user, authLoading]);

    const filteredStories = stories.filter(s =>
        s.prompt.toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <main style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
            <Navbar />

            <div style={{
                flex: 1,
                padding: "100px 24px 40px",
                maxWidth: "1200px",
                margin: "0 auto",
                width: "100%",
            }}>
                {/* Header */}
                <div style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "flex-end",
                    marginBottom: "48px",
                    gap: "24px",
                    flexWrap: "wrap",
                }}>
                    <div>
                        <button
                            onClick={() => router.push("/")}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                color: "var(--gold-muted)",
                                fontSize: "12px",
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                marginBottom: "12px",
                                padding: 0,
                            }}
                            className="hover:text-gold transition-colors"
                        >
                            <ArrowLeft01Icon size={14} />
                            Back to Studio
                        </button>
                        <h1 style={{
                            fontFamily: "var(--font-display)",
                            fontSize: "32px",
                            fontWeight: 700,
                            color: "var(--text-primary)",
                            margin: 0,
                        }}>
                            Story <span className="text-gold">Archive</span>
                        </h1>
                    </div>

                    <div style={{
                        display: "flex",
                        gap: "16px",
                        flex: 1,
                        maxWidth: "500px",
                    }}>
                        <div style={{
                            position: "relative",
                            flex: 1,
                        }}>
                            <Search01Icon
                                size={18}
                                style={{
                                    position: "absolute",
                                    left: "14px",
                                    top: "50%",
                                    transform: "translateY(-50%)",
                                    color: "var(--silver-dim)"
                                }}
                            />
                            <input
                                type="text"
                                value={searchTerm}
                                onChange={(e) => setSearchTerm(e.target.value)}
                                placeholder="Search by prompt..."
                                className="input-gold"
                                style={{
                                    paddingLeft: "44px",
                                    height: "44px",
                                    fontSize: "14px",
                                }}
                            />
                        </div>
                        <button className="btn-ghost" style={{ padding: "0 16px" }}>
                            <Sorting01Icon size={18} />
                        </button>
                    </div>
                </div>

                {/* Grid */}
                {loading ? (
                    <div style={{
                        height: "400px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "16px",
                        color: "var(--gold-muted)",
                    }}>
                        <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                        >
                            <HourglassIcon size={40} />
                        </motion.div>
                        <p style={{ fontFamily: "var(--font-mono)", fontSize: "11px", letterSpacing: "0.2em" }}>
                            FETCHING_ARCHIVES
                        </p>
                    </div>
                ) : (
                    <div style={{
                        display: "grid",
                        gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))",
                        gap: "32px",
                    }}>
                        <AnimatePresence>
                            {filteredStories.map((story) => (
                                <StoryCard
                                    key={story.id}
                                    story={story}
                                    onClick={() => {
                                        // TODO: Implement "Viewing" a finished story
                                        // For now, it could deep-link back to the studio with the session_id
                                        console.log("View Story:", story.id);
                                    }}
                                />
                            ))}
                        </AnimatePresence>
                    </div>
                )}

                {!loading && filteredStories.length === 0 && (
                    <div style={{
                        height: "300px",
                        display: "flex",
                        flexDirection: "column",
                        alignItems: "center",
                        justifyContent: "center",
                        gap: "12px",
                        opacity: 0.5,
                    }}>
                        <Search01Icon size={48} />
                        <p>No stories found in the archive.</p>
                    </div>
                )}
            </div>
        </main>
    );
}
