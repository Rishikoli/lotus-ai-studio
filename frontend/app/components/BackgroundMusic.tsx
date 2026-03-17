import { useEffect, useRef, useState } from "react";
import { Music, VolumeX, Volume2, Play, Pause, RotateCcw, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const VIBE_ASSETS: Record<string, string> = {
    dark_synth: "https://storage.googleapis.com/lotus-studio-media-489706/assets/audio/ambient_1.mp3",
    epic_orchestral: "https://storage.googleapis.com/lotus-studio-media-489706/assets/audio/ambient_2.mp3",
    lofi_mystery: "https://storage.googleapis.com/lotus-studio-media-489706/assets/audio/ambient_3.mp3",
    horror_ambient: "https://storage.googleapis.com/lotus-studio-media-489706/assets/audio/ambient_1.mp3",
    adventurous_folk: "https://storage.googleapis.com/lotus-studio-media-489706/assets/audio/ambient_2.mp3",
    classical_baroque: "https://storage.googleapis.com/lotus-studio-media-489706/assets/audio/ambient_3.mp3",
    classical_romantic: "https://storage.googleapis.com/lotus-studio-media-489706/assets/audio/ambient_1.mp3",
    classical_avantgarde: "https://storage.googleapis.com/lotus-studio-media-489706/assets/audio/ambient_2.mp3",
    cyberpunk_industrial: "https://storage.googleapis.com/lotus-studio-media-489706/assets/audio/ambient_3.mp3",
    ethereal_zen: "https://storage.googleapis.com/lotus-studio-media-489706/assets/audio/ambient_1.mp3",
    default: "https://storage.googleapis.com/lotus-studio-media-489706/assets/audio/ambient_1.mp3",
};

interface BackgroundMusicProps {
    vibe: string | null;
    ambientMusicUrl?: string | null;
    isGenerating: boolean;
}

export default function BackgroundMusic({ vibe, ambientMusicUrl, isGenerating }: BackgroundMusicProps) {
    const audioRef = useRef<HTMLAudioElement | null>(null);
    const [isMuted, setIsMuted] = useState(false);
    const [isPlaying, setIsPlaying] = useState(false);
    const [volume, setVolume] = useState(0.4);
    const [currentTime, setCurrentTime] = useState(0);
    const [duration, setDuration] = useState(0);
    const [hasInteracted, setHasInteracted] = useState(false);

    const analyzerRef = useRef<AnalyserNode | null>(null);
    const audioContextRef = useRef<AudioContext | null>(null);
    const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
    const animationFrameRef = useRef<number | null>(null);

    useEffect(() => {
        const handleInteraction = () => {
            setHasInteracted(true);
            if (!audioContextRef.current) {
                audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
            }
            if (audioContextRef.current.state === 'suspended') {
                audioContextRef.current.resume();
            }
            window.removeEventListener("click", handleInteraction);
        };
        window.addEventListener("click", handleInteraction);
        return () => {
            window.removeEventListener("click", handleInteraction);
            if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
        };
    }, []);

    const startAnalysis = () => {
        if (!audioRef.current || !audioContextRef.current || analyzerRef.current) return;
        
        const ctx = audioContextRef.current;
        const analyzer = ctx.createAnalyser();
        analyzer.fftSize = 256;
        analyzerRef.current = analyzer;

        const source = ctx.createMediaElementSource(audioRef.current);
        source.connect(analyzer);
        analyzer.connect(ctx.destination);
        sourceRef.current = source;

        const bufferLength = analyzer.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);

        const updateEnergy = () => {
            analyzer.getByteFrequencyData(dataArray);
            
            // Calculate energy bands
            let low = 0, mid = 0, high = 0;
            const third = Math.floor(bufferLength / 3);
            
            for (let i = 0; i < third; i++) low += dataArray[i];
            for (let i = third; i < 2 * third; i++) mid += dataArray[i];
            for (let i = 2 * third; i < bufferLength; i++) high += dataArray[i];
            
            (window as any).__LOTUS_AUDIO_ENERGY__ = {
                low: (low / third) / 255,
                mid: (mid / third) / 255,
                high: (high / third) / 255
            };

            animationFrameRef.current = requestAnimationFrame(updateEnergy);
        };
        updateEnergy();
    };

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.loop = true;
            audioRef.current.crossOrigin = "anonymous";
            
            audioRef.current.ontimeupdate = () => {
                if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
            };
            audioRef.current.onloadedmetadata = () => {
                if (audioRef.current) setDuration(audioRef.current.duration);
            };
            audioRef.current.onplay = () => {
                setIsPlaying(true);
                startAnalysis();
            };
            audioRef.current.onpause = () => setIsPlaying(false);
        }

        const audio = audioRef.current;
        const targetSrc = ambientMusicUrl || VIBE_ASSETS[vibe || "default"] || VIBE_ASSETS.default;

        if (audio.src !== targetSrc) {
            let vol = audio.volume;
            const fadeOut = setInterval(() => {
                vol = Math.max(0, vol - 0.05);
                audio.volume = vol;
                if (vol <= 0) {
                    clearInterval(fadeOut);
                    audio.src = targetSrc;
                    audio.load();
                    if (!isMuted && (isGenerating || vibe || ambientMusicUrl)) {
                        audio.play().catch(() => {
                            console.log("Audio play blocked, waiting for interaction");
                        });
                        fadeIn();
                    }
                }
            }, 50);
        } else if (!isMuted && (isGenerating || vibe || ambientMusicUrl) && (audio.paused || (hasInteracted && audio.paused))) {
             audio.play().catch(() => {});
             fadeIn();
        }

        function fadeIn() {
            let vol = 0;
            audio.volume = 0;
            const fadeInInterval = setInterval(() => {
                vol = Math.min(volume, vol + 0.05);
                audio.volume = vol;
                if (vol >= volume) clearInterval(fadeInInterval);
            }, 50);
        }
    }, [vibe, ambientMusicUrl, isGenerating, isMuted, volume, hasInteracted]);

    const togglePlay = () => {
        if (!audioRef.current) return;
        if (isPlaying) {
            audioRef.current.pause();
        } else {
            audioRef.current.play().catch(() => {});
        }
    };

    const restartMusic = () => {
        if (!audioRef.current) return;
        audioRef.current.currentTime = 0;
        audioRef.current.play().catch(() => {});
    };

    const toggleMute = () => {
        setIsMuted(!isMuted);
        if (audioRef.current) {
            audioRef.current.muted = !isMuted;
        }
    };

    if (!vibe && !isGenerating && !ambientMusicUrl) return null;

    const progress = duration > 0 ? (currentTime / duration) * 100 : 0;

    return (
        <div 
            style={{
                position: "fixed",
                bottom: "24px",
                right: "90px", 
                zIndex: 100,
                display: "flex",
                flexDirection: "column",
                gap: "8px",
                minWidth: "260px",
                background: "rgba(10,10,12,0.7)",
                backdropFilter: "blur(20px)",
                padding: "12px 16px",
                borderRadius: "16px",
                border: "1px solid rgba(201, 168, 76, 0.2)",
                boxShadow: "0 12px 40px rgba(0,0,0,0.6)",
            }}
            className="animate-fade-in"
        >
            <AnimatePresence>
                {!hasInteracted && !isMuted && (
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 10 }}
                        style={{ position: "absolute", bottom: "100%", right: "0", marginBottom: "12px", background: "var(--color-gold)", color: "black", padding: "6px 14px", borderRadius: "100px", fontSize: "10px", fontWeight: "bold", whiteSpace: "nowrap", boxShadow: "0 4px 20px rgba(201,168,76,0.3)" }}
                    >
                        Click anywhere to activate Score
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Track Info */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    {isGenerating && !ambientMusicUrl ? (
                         <Activity size={14} color="var(--color-gold)" className="animate-pulse" />
                    ) : (
                         <Music size={14} color="var(--color-gold)" />
                    )}
                   
                    <div style={{ display: "flex", flexDirection: "column" }}>
                        <span style={{ fontSize: "9px", color: "var(--color-gold)", fontFamily: "var(--font-mono)", textTransform: "uppercase", letterSpacing: "0.2em", opacity: 0.6 }}>
                            {ambientMusicUrl ? "ORIGINAL SCORE" : "AMBIENT VIBE"}
                        </span>
                        <span style={{ fontSize: "11px", color: "var(--text-primary)", fontWeight: 600, fontFamily: "var(--font-sans)", textTransform: "uppercase", letterSpacing: "0.05em" }}>
                            {ambientMusicUrl ? "Generated Theme #1" : (vibe ? vibe.replace("_", " ") : "Composing...")}
                        </span>
                    </div>
                </div>

                <div style={{ display: "flex", gap: "4px" }}>
                    <button onClick={restartMusic} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-muted)", padding: "4px" }}>
                        <RotateCcw size={12} />
                    </button>
                    <button onClick={toggleMute} style={{ background: "none", border: "none", cursor: "pointer", color: isMuted ? "var(--color-error)" : "var(--color-gold)", padding: "4px" }}>
                        {isMuted ? <VolumeX size={14} /> : <Volume2 size={14} />}
                    </button>
                </div>
            </div>

            {/* Playback Progress */}
            <div style={{ width: "100%", height: "4px", background: "rgba(255,255,255,0.05)", borderRadius: "2px", position: "relative", overflow: "hidden", marginTop: "4px" }}>
                <motion.div 
                    animate={{ width: `${progress}%` }}
                    transition={{ type: "spring", bounce: 0, duration: 0.5 }}
                    style={{ height: "100%", background: "var(--color-gold)", boxShadow: "0 0 10px var(--color-gold)" }}
                />
            </div>

            {/* Controls Row */}
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginTop: "4px" }}>
                <button 
                    onClick={togglePlay}
                    style={{
                        background: "var(--color-gold)",
                        border: "none",
                        width: "32px", height: "32px",
                        borderRadius: "50%",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        cursor: "pointer",
                        color: "black",
                        transition: "transform 0.2s ease"
                    }}
                    onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
                    onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >
                    {isPlaying ? <Pause size={16} fill="black" /> : <Play size={16} fill="black" style={{ marginLeft: "2px" }} />}
                </button>

                <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
                    <input 
                        type="range" 
                        min="0" 
                        max="1" 
                        step="0.05" 
                        value={volume}
                        onChange={(e) => setVolume(parseFloat(e.target.value))}
                        style={{
                            width: "80px",
                            accentColor: "var(--color-gold)",
                            height: "2px",
                            cursor: "pointer",
                        }}
                    />
                    <span style={{ fontSize: "9px", color: "var(--text-muted)", fontFamily: "var(--font-mono)", width: "35px" }}>
                        {isGenerating && !ambientMusicUrl ? "SYNC" : `${Math.floor(currentTime)}s`}
                    </span>
                </div>
            </div>
        </div>
    );
}
