/**
 * useAudioEngine.ts — Advanced Audio Engine for Lotus AI Studio
 * Handles synced stem layering and character leitmotifs with dynamic mixing.
 */
"use client";

import { useEffect, useRef, useCallback, useState } from "react";

export type AudioStem = "ambient" | "rhythm" | "melody";

interface StemRef {
    audio: HTMLAudioElement;
    targetVolume: number;
}

export function useAudioEngine(stems: Record<string, string> | null, vibe: string | null) {
    const stemRefs = useRef<Record<string, StemRef>>({});
    const leitmotifRef = useRef<HTMLAudioElement | null>(null);
    const analyzerRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const dataArrayRef = useRef<Uint8Array | null>(null);

    const [isPlaying, setIsPlaying] = useState(false);
    const [isMuted, setIsMuted] = useState(false);

    // Initialize Audio Context & Analyzer
    useEffect(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            analyzerRef.current = audioContextRef.current.createAnalyser();
            analyzerRef.current.fftSize = 256;
            dataArrayRef.current = new Uint8Array(analyzerRef.current.frequencyBinCount);
        }
    }, []);

    // Initialize/Update Stems
    useEffect(() => {
        if (!stems || !audioContextRef.current || !analyzerRef.current) return;

        Object.entries(stems).forEach(([key, url]) => {
            if (!stemRefs.current[key]) {
                const audio = new Audio(url);
                audio.loop = true;
                audio.volume = 0;
                audio.crossOrigin = "anonymous"; // Needed for Web Audio API across domains
                
                const source = audioContextRef.current!.createMediaElementSource(audio);
                source.connect(analyzerRef.current!);
                analyzerRef.current!.connect(audioContextRef.current!.destination);

                stemRefs.current[key] = { audio, targetVolume: key === "ambient" ? 1 : 0 };
                
                if (isPlaying) {
                    audio.play().catch(console.warn);
                    if (key !== "ambient" && stemRefs.current["ambient"]) {
                        audio.currentTime = stemRefs.current["ambient"].audio.currentTime;
                    }
                }
            } else if (stemRefs.current[key].audio.src !== url) {
                stemRefs.current[key].audio.src = url;
                if (isPlaying) stemRefs.current[key].audio.play().catch(console.warn);
            }
        });
// ... rest of the file logic ...
    }, [stems, isPlaying]);

    // Constant Sync Loop & Multi-Stem Sync
    useEffect(() => {
        const interval = setInterval(() => {
            if (!isPlaying || !stemRefs.current["ambient"]) return;
            const masterTime = stemRefs.current["ambient"].audio.currentTime;
            
            Object.values(stemRefs.current).forEach(ref => {
                if (Math.abs(ref.audio.currentTime - masterTime) > 0.1) {
                    ref.audio.currentTime = masterTime;
                }
                
                // Smooth Fading
                const currentVol = ref.audio.volume;
                const target = isMuted ? 0 : ref.targetVolume;
                if (Math.abs(currentVol - target) > 0.01) {
                    ref.audio.volume = currentVol + (target - currentVol) * 0.1;
                }
            });
        }, 100);

        return () => clearInterval(interval);
    }, [isPlaying, isMuted]);

    const play = useCallback(() => {
        if (audioContextRef.current?.state === "suspended") {
            audioContextRef.current.resume();
        }
        setIsPlaying(true);
        Object.values(stemRefs.current).forEach(ref => ref.audio.play().catch(console.warn));
    }, []);

    const pause = useCallback(() => {
        setIsPlaying(false);
        Object.values(stemRefs.current).forEach(ref => ref.audio.pause());
    }, []);

    const toggleMute = useCallback(() => setIsMuted(prev => !prev), []);

    const setStemIntensity = useCallback((key: AudioStem, intensity: number) => {
        if (stemRefs.current[key]) {
            stemRefs.current[key].targetVolume = intensity;
        }
    }, []);

    const playLeitmotif = useCallback((url: string) => {
        if (leitmotifRef.current) {
            leitmotifRef.current.pause();
        }
        leitmotifRef.current = new Audio(url);
        leitmotifRef.current.volume = isMuted ? 0 : 0.8;
        leitmotifRef.current.play().catch(console.warn);
    }, [isMuted]);

    // Real-time Audio Energy Exporter
    const getAudioEnergy = useCallback(() => {
        if (!analyzerRef.current || !dataArrayRef.current || !isPlaying) return { low: 0, mid: 0, high: 0 };
        
        analyzerRef.current.getByteFrequencyData(dataArrayRef.current as any);
        const data = dataArrayRef.current;
        
        let low = 0, mid = 0, high = 0;
        const total = data.length;
        const lowRange = Math.floor(total * 0.1);
        const midRange = Math.floor(total * 0.5);
        
        for (let i = 0; i < lowRange; i++) low += data[i];
        for (let i = lowRange; i < midRange; i++) mid += data[i];
        for (let i = midRange; i < total; i++) high += data[i];
        
        const energy = {
            low: (low / lowRange) / 255,
            mid: (mid / (midRange - lowRange)) / 255,
            high: (high / (total - midRange)) / 255
        };

        // Expose globally for high-performance physics access
        (window as any).__LOTUS_AUDIO_ENERGY__ = energy;
        
        return energy;
    }, [isPlaying]);

    // Spatial Audio Utility
    const playSpatialSound = useCallback((url: string, xPos: number) => {
        if (!audioContextRef.current || !analyzerRef.current) return;
        
        const audio = new Audio(url);
        audio.crossOrigin = "anonymous";
        
        const source = audioContextRef.current.createMediaElementSource(audio);
        const panner = audioContextRef.current.createPanner();
        
        // Positioning: x from -1 (left) to 1 (right)
        panner.setPosition(xPos * 5, 0, 1); // 5 is a gain factor for spread
        panner.panningModel = "equalpower";
        
        source.connect(panner);
        panner.connect(analyzerRef.current);
        
        audio.play().catch(console.warn);
        return audio;
    }, []);

    return { play, pause, toggleMute, setStemIntensity, playLeitmotif, playSpatialSound, getAudioEnergy, isPlaying, isMuted };
}
