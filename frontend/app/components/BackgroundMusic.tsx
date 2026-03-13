import { Music, VolumeX, Volume2, Play, Pause, RotateCcw, Activity } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

const VIBE_ASSETS: Record<string, string> = {
    dark_synth: "https://actions.google.com/sounds/v1/ambient/dark_synth_loop.mp3",
    epic_orchestral: "https://actions.google.com/sounds/v1/ambient/epic_heroic_loop.mp3",
    lofi_mystery: "https://actions.google.com/sounds/v1/ambient/mystery_ambience.mp3",
    horror_ambient: "https://actions.google.com/sounds/v1/ambient/horror_drone.mp3",
    adventurous_folk: "https://actions.google.com/sounds/v1/ambient/acoustic_travel.mp3",
    classical_baroque: "https://actions.google.com/sounds/v1/ambient/church_bells_ambient.mp3",
    classical_romantic: "https://actions.google.com/sounds/v1/ambient/meditation_bell.mp3",
    classical_avantgarde: "https://actions.google.com/sounds/v1/ambient/horror_wind_tunnel.mp3",
    cyberpunk_industrial: "https://actions.google.com/sounds/v1/ambient/metal_impact_echo.mp3",
    ethereal_zen: "https://actions.google.com/sounds/v1/ambient/crystal_cave.mp3",
    default: "https://actions.google.com/sounds/v1/ambient/ambient_hum.mp3",
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

    useEffect(() => {
        const handleInteraction = () => {
            setHasInteracted(true);
            window.removeEventListener("click", handleInteraction);
        };
        window.addEventListener("click", handleInteraction);
        return () => window.removeEventListener("click", handleInteraction);
    }, []);

    useEffect(() => {
        if (!audioRef.current) {
            audioRef.current = new Audio();
            audioRef.current.loop = true;
            
            audioRef.current.ontimeupdate = () => {
                if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
            };
            audioRef.current.onloadedmetadata = () => {
                if (audioRef.current) setDuration(audioRef.current.duration);
            };
            audioRef.current.onplay = () => setIsPlaying(true);
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
