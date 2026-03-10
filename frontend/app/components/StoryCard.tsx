"use client";

import { motion } from "motion/react";
import type { StoryCommit } from "../types";
import { TEMPLATE_META } from "../types";
import {
    Calendar01Icon,
    GitBranchIcon,
    Image01Icon,
    ArrowRight01Icon,
    Film01Icon,
    Moon02Icon,
    MagicWand01Icon,
    LaughingIcon,
    SkullIcon
} from "hugeicons-react";

const ICON_MAP: Record<string, any> = {
    film: Film01Icon,
    moody: Moon02Icon,
    magic: MagicWand01Icon,
    laugh: LaughingIcon,
    horror: SkullIcon,
};

interface StoryCardProps {
    story: StoryCommit;
    onClick: () => void;
}

export default function StoryCard({ story, onClick }: StoryCardProps) {
    const template = TEMPLATE_META[story.pipeline_template] || TEMPLATE_META.default;
    const Icon = ICON_MAP[template.iconId] || Film01Icon;

    // Get the first panel's image as cover
    const coverImage = story.panels.find(p => p.image_url)?.image_url;

    return (
        <motion.div
            whileHover={{ y: -8, scale: 1.02 }}
            onClick={onClick}
            style={{
                background: "var(--bg-card)",
                border: "1px solid var(--border-gold-alpha)",
                borderRadius: "var(--radius-xl)",
                overflow: "hidden",
                cursor: "pointer",
                display: "flex",
                flexDirection: "column",
                position: "relative",
                transition: "border-color 0.3s ease",
            }}
            className="group"
        >
            {/* Cover Image */}
            <div style={{
                height: "180px",
                width: "100%",
                background: coverImage ? `url(${coverImage})` : "var(--bg-darker)",
                backgroundSize: "cover",
                backgroundPosition: "center",
                position: "relative",
            }}>
                {!coverImage && (
                    <div style={{
                        height: "100%",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        opacity: 0.2
                    }}>
                        <Image01Icon size={48} />
                    </div>
                )}
                <div style={{
                    position: "absolute",
                    top: "12px",
                    right: "12px",
                    padding: "4px 10px",
                    background: "rgba(0,0,0,0.6)",
                    backdropFilter: "blur(8px)",
                    borderRadius: "20px",
                    display: "flex",
                    alignItems: "center",
                    gap: "6px",
                    border: `1px solid ${template.color}44`,
                }}>
                    <Icon
                        size={14}
                        className="glow-icon-active"
                        style={{ color: template.color }}
                    />
                    <span style={{
                        fontSize: "10px",
                        color: template.color,
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.05em"
                    }}>
                        {template.label}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "12px" }}>
                <p style={{
                    fontSize: "14px",
                    color: "var(--text-primary)",
                    lineHeight: "1.5",
                    margin: 0,
                    display: "-webkit-box",
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: "vertical",
                    overflow: "hidden",
                }}>
                    {story.prompt}
                </p>

                <div style={{
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "space-between",
                    marginTop: "8px",
                }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--gold-muted)" }}>
                            <Calendar01Icon size={12} />
                            <span style={{ fontSize: "10px" }}>
                                {new Date(story.created_at).toLocaleDateString()}
                            </span>
                        </div>
                        {story.branch_ids.length > 0 && (
                            <div style={{ display: "flex", alignItems: "center", gap: "4px", color: "var(--text-muted)" }}>
                                <GitBranchIcon size={12} />
                                <span style={{ fontSize: "10px" }}>
                                    {story.branch_ids.length}
                                </span>
                            </div>
                        )}
                    </div>

                    <motion.div
                        animate={{ x: [0, 5, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity }}
                        style={{ color: "var(--gold-primary)" }}
                    >
                        <ArrowRight01Icon size={16} />
                    </motion.div>
                </div>
            </div>

            {/* Hover Glint */}
            <div style={{
                position: "absolute",
                inset: 0,
                background: "linear-gradient(45deg, transparent, rgba(201, 168, 76, 0.05), transparent)",
                transform: "translateX(-100%) transition: transform 0.6s ease",
            }} className="group-hover:translate-x-full" />
        </motion.div>
    );
}
