"use client";

import { useState } from "react";
import type { PipelineTemplate } from "../types";
import { TEMPLATE_META } from "../types";

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
                    return (
                        <button
                            key={key}
                            onClick={() => onChange(key)}
                            style={{
                                display: "flex",
                                alignItems: "center",
                                gap: "6px",
                                padding: "8px 14px",
                                borderRadius: "var(--radius-md)",
                                border: `1px solid ${isActive ? meta.color : "var(--border-subtle)"}`,
                                background: isActive ? `${meta.color}18` : "var(--bg-panel)",
                                color: isActive ? meta.color : "var(--silver-dim)",
                                fontFamily: "var(--font-sans)",
                                fontSize: "13px",
                                fontWeight: isActive ? 600 : 400,
                                cursor: "pointer",
                                transition: "all var(--transition-base)",
                                boxShadow: isActive ? `0 0 12px ${meta.color}30` : "none",
                            }}
                        >
                            <span>{meta.icon}</span>
                            <span>{meta.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
