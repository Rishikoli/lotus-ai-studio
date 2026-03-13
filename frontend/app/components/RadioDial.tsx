"use client";

import React, { useState, useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring } from "motion/react";

interface RadioDialProps {
    currentVibe: string | null;
    onVibeChange: (vibe: string) => void;
    size?: number;
}

const VIBES = [
    { id: "dark_synth", label: "SYNTH", freq: "88.1" },
    { id: "epic_orchestral", label: "EPIC", freq: "92.5" },
    { id: "lofi_mystery", label: "LOFI", freq: "96.3" },
    { id: "classical_romantic", label: "CLASSIC", freq: "101.1" },
    { id: "cyberpunk_industrial", label: "CYBER", freq: "105.7" },
    { id: "ethereal_zen", label: "ZEN", freq: "107.9" },
];

export default function RadioDial({ currentVibe, onVibeChange, size = 180 }: RadioDialProps) {
    const housingRef = useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = useState(false);
    const rotation = useMotionValue(0);
    const smoothRotation = useSpring(rotation, { stiffness: 300, damping: 30 });

    const housingSize = size;
    const innerDialSize = size * 0.65;
    const tickRadius = size * 0.42;

    // Map rotation to vibe index
    useEffect(() => {
        const index = VIBES.findIndex(v => v.id === currentVibe);
        if (index !== -1 && !isDragging) {
            rotation.set(index * 60); // 360 / 6
        }
    }, [currentVibe, isDragging, rotation]);

    const handleDragEnd = () => {
        setIsDragging(false);
        const currentRot = rotation.get();
        const normalizedRot = ((currentRot % 360) + 360) % 360;
        const index = Math.round(normalizedRot / 60) % VIBES.length;
        onVibeChange(VIBES[index].id);
    };

    const currentVibeData = VIBES.find(v => v.id === currentVibe) || VIBES[0];

    return (
        <div 
            ref={housingRef}
            style={{ position: "relative", width: `${housingSize + 20}px`, height: `${housingSize + 20}px`, display: "flex", alignItems: "center", justifyContent: "center" }}
        >
            {/* Background Glow */}
            <motion.div
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.1, 0.2, 0.1]
                }}
                transition={{ duration: 3, repeat: Infinity }}
                style={{
                    position: "absolute",
                    width: `${housingSize * 1.2}px`,
                    height: `${housingSize * 1.2}px`,
                    borderRadius: "50%",
                    background: "radial-gradient(circle, var(--color-gold) 0%, transparent 70%)",
                }}
            />

            {/* Dial Housing */}
            <div style={{
                width: `${housingSize}px`,
                height: `${housingSize}px`,
                borderRadius: "50%",
                background: "rgba(10,10,12,0.9)",
                border: "3px solid rgba(201, 168, 76, 0.3)",
                backdropFilter: "blur(30px)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                position: "relative",
                boxShadow: "0 24px 60px rgba(0,0,0,0.8), inset 0 0 40px rgba(201, 168, 76, 0.05)"
            }}>
                {/* Tick Marks */}
                {[...Array(24)].map((_, i) => (
                    <div
                        key={i}
                        style={{
                            position: "absolute",
                            width: i % 4 === 0 ? "3px" : "2px",
                            height: i % 4 === 0 ? "14px" : "8px",
                            background: i % 4 === 0 ? "rgba(201, 168, 76, 0.6)" : "rgba(201, 168, 76, 0.2)",
                            transform: `rotate(${i * 15}deg) translateY(-${tickRadius}px)`,
                        }}
                    />
                ))}

                {/* Rotating Inner Dial */}
                <motion.div
                    drag={true}
                    dragConstraints={{ left: 0, right: 0, top: 0, bottom: 0 }}
                    onDragStart={() => setIsDragging(true)}
                    onDragEnd={handleDragEnd}
                    onDrag={(e, info) => {
                        if (!housingRef.current) return;
                        const rect = housingRef.current.getBoundingClientRect();
                        const centerX = rect.left + rect.width / 2;
                        const centerY = rect.top + rect.height / 2;
                        const angle = Math.atan2(info.point.y - centerY, info.point.x - centerX) * (180 / Math.PI);
                        rotation.set(angle + 90);
                    }}
                    style={{
                        width: `${innerDialSize}px`,
                        height: `${innerDialSize}px`,
                        borderRadius: "50%",
                        background: "linear-gradient(135deg, #1f1f1f 0%, #050505 100%)",
                        border: "1px solid rgba(255,255,255,0.15)",
                        boxShadow: "inset 0 4px 20px rgba(255,255,255,0.05), 0 12px 32px rgba(0,0,0,0.9)",
                        cursor: "grab",
                        rotate: rotation,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center"
                    }}
                    whileTap={{ cursor: "grabbing", scale: 0.98 }}
                >
                    {/* Dial Indicator Knot */}
                    <div style={{
                        position: "absolute",
                        top: "16px",
                        width: "8px",
                        height: "8px",
                        borderRadius: "50%",
                        background: "var(--color-gold)",
                        boxShadow: "0 0 15px var(--color-gold)"
                    }} />
                    
                    {/* Dial Texture Lines */}
                    <div style={{
                        width: `${innerDialSize * 0.8}px`,
                        height: `${innerDialSize * 0.8}px`,
                        borderRadius: "50%",
                        border: "1px dashed rgba(201, 168, 76, 0.15)",
                        opacity: 0.5
                    }} />
                </motion.div>

                {/* Digital Frequency Readout */}
                <div style={{
                    position: "absolute",
                    bottom: "-50px",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    gap: "4px"
                }}>
                    <motion.span 
                        key={currentVibeData.freq}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        style={{ 
                            fontFamily: "var(--font-mono)", 
                            fontSize: "24px", 
                            color: "var(--color-gold)", 
                            fontWeight: "bold",
                            letterSpacing: "0.1em",
                            textShadow: "0 0 20px rgba(201, 168, 76, 0.6)"
                        }}
                    >
                        {currentVibeData.freq}
                    </motion.span>
                    <span style={{ 
                        fontSize: "12px", 
                        color: "var(--silver-dim)", 
                        fontFamily: "var(--font-mono)", 
                        textTransform: "uppercase", 
                        letterSpacing: "0.3em" 
                    }}>
                        {currentVibeData.label} MODE
                    </span>
                </div>
            </div>
        </div>
    );
}
