"use client";

import { useState } from "react";
import type { PipelineTemplate } from "../types";
import { TEMPLATE_META } from "../types";
import {
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

interface TemplatePickerProps {
    selected: PipelineTemplate;
    onChange: (t: PipelineTemplate) => void;
}

export default function TemplatePicker({ selected, onChange }: TemplatePickerProps) {
    const templates = Object.entries(TEMPLATE_META) as [PipelineTemplate, typeof TEMPLATE_META[PipelineTemplate]][];

    return (
        <div>
            <p
                style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: "10px",
                    letterSpacing: "0.2em",
                    color: "var(--text-muted)",
                    textTransform: "uppercase",
                    marginBottom: "12px",
                }}
            >
                Pipeline Template
            </p>
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {templates.map(([key, meta]) => {
                    const isActive = selected === key;
                    const Icon = ICON_MAP[meta.iconId] || Film01Icon;

                    return (
                        <button
                            key={key}
                            onClick={() => onChange(key)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "8px",
                                padding: "8px 14px",
                                borderRadius: "var(--radius-md)",
                                border: `1px solid ${isActive ? meta.color : "rgba(255,255,255,0.05)"}`,
                                background: isActive ? `${meta.color}25` : "rgba(255,255,255,0.05)",
                                backdropFilter: "blur(12px)",
                                color: isActive ? meta.color : "var(--text-secondary)",
                                fontFamily: "var(--font-sans)",
                                fontSize: "14px",
                                fontWeight: 500,
                                cursor: "pointer",
                                transition: "all var(--transition-base)",
                                boxShadow: isActive ? `0 0 12px ${meta.color}30` : "none",
                            }}
                        >
                            <Icon
                                size={18}
                                className={isActive ? "glow-icon-active" : ""}
                                style={{ color: isActive ? "inherit" : "var(--text-muted)" }}
                            />
                            <span>{meta.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
