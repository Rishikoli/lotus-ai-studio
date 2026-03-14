"use client";

import React, { useEffect, useRef } from "react";
import { motion } from "motion/react";

interface EtchedHUDProps {
    vibe: string | null;
}

export default function EtchedHUD({ vibe }: EtchedHUDProps) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const requestRef = useRef<number>(0);

    useEffect(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const ctx = canvas.getContext("2d");
        if (!ctx) return;

        let width = canvas.width = window.innerWidth;
        let height = canvas.height = 100;

        const handleResize = () => {
            width = canvas.width = window.innerWidth;
        };
        window.addEventListener("resize", handleResize);

        let phase = 0;
        
        const render = () => {
            ctx.clearRect(0, 0, width, height);
            
            const energy = (window as any).__LOTUS_AUDIO_ENERGY__ || { low: 0, mid: 0, high: 0 };
            const lowImpact = energy.low * 60; // Bass drives amplitude
            const midImpact = energy.mid * 20;
            
            // Draw thin golden waveform
            ctx.beginPath();
            ctx.strokeStyle = `rgba(201, 168, 76, ${0.4 + energy.low * 0.4})`;
            ctx.lineWidth = 1.5 + (energy.low * 2);
            ctx.shadowBlur = 15 + (energy.low * 20);
            ctx.shadowColor = "rgba(201, 168, 76, 0.8)";
            
            ctx.moveTo(0, height / 2);
            
            for (let x = 0; x < width; x += 5) {
                const multiFactor = vibe ? 1.5 : 0.6;
                const dynamicY = Math.sin(x * 0.01 + phase) * (15 + lowImpact) * multiFactor + 
                                Math.sin(x * 0.02 - phase * 0.5) * (8 + midImpact) * multiFactor;
                
                ctx.lineTo(x, height / 2 + dynamicY);
            }
            
            ctx.stroke();
            
            phase += 0.02 + (energy.low * 0.1); // Speed up on bass
            requestRef.current = requestAnimationFrame(render);
        };

        render();

        return () => {
            window.removeEventListener("resize", handleResize);
            cancelAnimationFrame(requestRef.current);
        };
    }, [vibe]);

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="etched-hud-container"
            style={{
                position: "fixed",
                bottom: "0",
                left: "0",
                width: "100%",
                height: "60px",
                zIndex: 50,
                pointerEvents: "none",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                overflow: "hidden"
            }}
        >
            <canvas 
                ref={canvasRef} 
                style={{ 
                    width: "100%", 
                    height: "100%",
                    display: "block"
                }} 
            />
        </motion.div>
    );
}
