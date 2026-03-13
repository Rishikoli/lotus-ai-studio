"use client";

import { useState, useRef } from "react";
import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";
import { Download01Icon, RefreshIcon, Tv01Icon as MovieIcon, Tick01Icon } from "hugeicons-react";
import { StoryPanel } from "../types";

const SFX_ASSETS: Record<string, string> = {
    thunder: "https://actions.google.com/sounds/v1/weather/thunder_crack.mp3",
    heartbeat: "https://actions.google.com/sounds/v1/foley/heartbeat.mp3",
    explosion: "https://actions.google.com/sounds/v1/foley/explosion.mp3",
    whoosh: "https://actions.google.com/sounds/v1/foley/whoosh.mp3",
    glitch: "https://actions.google.com/sounds/v1/foley/glitch_error.mp3",
    rain_patter: "https://actions.google.com/sounds/v1/weather/rain_on_roof.mp3",
    wind_howl: "https://actions.google.com/sounds/v1/weather/wind_howl.mp3",
};

const VIBE_ASSETS: Record<string, string> = {
    dark_synth: "https://actions.google.com/sounds/v1/ambient/dark_synth_loop.mp3",
    epic_orchestral: "https://actions.google.com/sounds/v1/ambient/epic_heroic_loop.mp3",
    lofi_mystery: "https://actions.google.com/sounds/v1/ambient/mystery_ambience.mp3",
    horror_ambient: "https://actions.google.com/sounds/v1/ambient/horror_drone.mp3",
    adventurous_folk: "https://actions.google.com/sounds/v1/ambient/acoustic_travel.mp3",
    default: "https://actions.google.com/sounds/v1/ambient/ambient_hum.mp3",
};

interface MovieExportProps {
    panels: StoryPanel[];
    sessionId: string;
    vibe?: string | null;
}

export default function MovieExport({ panels, sessionId, vibe }: MovieExportProps) {
    const [status, setStatus] = useState<"idle" | "loading" | "processing" | "done" | "error">("idle");
    const [progress, setProgress] = useState(0);
    const ffmpegRef = useRef(new FFmpeg());

    const loadFFmpeg = async () => {
        const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd";
        const ffmpeg = ffmpegRef.current;
        ffmpeg.on("log", ({ message }) => {
            console.log("FFmpeg:", message);
        });
        ffmpeg.on("progress", ({ progress }) => {
            setProgress(Math.round(progress * 100));
        });
        await ffmpeg.load({
            coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
            wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
        });
    };

    const exportMovie = async () => {
        if (panels.length === 0) return;
        setStatus("loading");
        try {
            const ffmpeg = ffmpegRef.current;
            if (!ffmpeg.loaded) {
                await loadFFmpeg();
            }

            setStatus("processing");
            setProgress(0);

            // 1. Write and Process Background Music (8D Filter)
            const musicSrc = VIBE_ASSETS[vibe || "default"] || VIBE_ASSETS.default;
            const musicData = await fetchFile(musicSrc);
            await ffmpeg.writeFile("bg_music_raw.mp3", musicData);
            
            // Apply 8D effect: Auto-pan (apulsator) + Reverb (aecho)
            await ffmpeg.exec([
                "-i", "bg_music_raw.mp3",
                "-af", "apulsator=hz=0.125:amount=1,aecho=0.8:0.88:6:0.4",
                "bg_music_8d.mp3"
            ]);

            const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
            const FALLBACK_IMG_URL = "/lotus-animated.svg"; // Fallback static asset
            const inputFiles: string[] = [];

            for (let i = 0; i < panels.length; i++) {
                const panel = panels[i];
                const imgName = `img${i}.jpg`;
                const audName = `aud${i}.mp3`;
                const sfxName = `sfx${i}.mp3`;
                const vidName = `part${i}.mp4`;

                // Fetch image and narration
                let imgData, audData;

                // Helper to resolve URLs
                const getAssetUrl = (url: string) => {
                    if (!url) return "";
                    return url.startsWith("/") ? `${API_URL}${url}` : url;
                };

                try {
                    // Try preferred image, fallback to lotus branding if fails
                    const targetUrl = getAssetUrl(panel.image_url || "");
                    try {
                        imgData = await fetchFile(targetUrl);
                    } catch (fetchErr) {
                        console.warn(`Panel ${i} image fetch failed, using brand fallback.`, fetchErr);
                        imgData = await fetchFile(FALLBACK_IMG_URL);
                    }
                    await ffmpeg.writeFile(imgName, imgData);
                } catch (e) {
                    console.error(`Critical image failure for panel ${i}:`, e);
                    continue; 
                }

                try {
                    const audUrl = getAssetUrl(panel.audio_url || "");
                    if (!audUrl) throw new Error("No audio URL");
                    audData = await fetchFile(audUrl);
                    await ffmpeg.writeFile(audName, audData);
                } catch (e) {
                    console.error(`Failed to fetch audio for panel ${i}:`, e);
                    // Create a silent audio track fallback if audio missing
                    // This prevents FFmpeg from crashing on missing streams
                    await ffmpeg.exec(["-f", "lavfi", "-i", "anullsrc=r=44100:cl=mono", "-t", "5", audName]);
                }
                
                // Fetch SFX if exists
                let hasSfx = false;
                if (panel.sfx_cue && SFX_ASSETS[panel.sfx_cue]) {
                    try {
                        const sfxData = await fetchFile(SFX_ASSETS[panel.sfx_cue]);
                        await ffmpeg.writeFile(sfxName, sfxData);
                        hasSfx = true;
                    } catch (e) {
                        console.warn("Could not fetch SFX for cue:", panel.sfx_cue);
                    }
                }

                // Create Cinematic Clip for this panel
                // -vf zoompan for Dolby Zoom effect
                // -af amix for mixing narration + optional SFX
                const ffmpegArgs = [
                    "-loop", "1", "-t", "5", // Max duration 5s per panel fallback
                    "-i", imgName,
                    "-i", audName
                ];

                if (hasSfx) {
                    ffmpegArgs.push("-i", sfxName);
                }

                // Complex filters: 
                // 1. Video: Scale + Zoompan (Ken Burns)
                // 2. Audio: Mix narration and SFX
                const videoFilter = "scale=1280:720,zoompan=z='min(zoom+0.0015,1.5)':d=125:x='iw/2-(iw/zoom)/2':y='ih/2-(ih/zoom)/2':s=1280x720";
                const audioFilter = hasSfx 
                    ? "[1:a][2:a]amix=inputs=2:duration=first[a]" 
                    : "[1:a]anull[a]";

                await ffmpeg.exec([
                    "-loop", "1",
                    "-i", imgName,
                    "-i", audName,
                    ...(hasSfx ? ["-i", sfxName] : []),
                    "-filter_complex", 
                    `[0:v]${videoFilter}[v]; ${audioFilter}`,
                    "-map", "[v]",
                    "-map", "[a]",
                    "-c:v", "libx264",
                    "-tune", "stillimage",
                    "-c:a", "aac",
                    "-b:a", "192k",
                    "-pix_fmt", "yuv420p",
                    "-shortest",
                    vidName
                ]);

                inputFiles.push(vidName);
            }

            // 2. Concat all panel parts
            const concatListData = inputFiles.map(name => `file ${name}`).join("\n");
            await ffmpeg.writeFile("concat_list.txt", concatListData);

            await ffmpeg.exec([
                "-f", "concat", 
                "-safe", "0", 
                "-i", "concat_list.txt", 
                "-c", "copy", 
                "story_no_music.mp4"
            ]);

            // 3. Final Mix: Story + 8D Background Music
            // We use amerge or amix. amix is easier.
            await ffmpeg.exec([
                "-i", "story_no_music.mp4",
                "-i", "bg_music_8d.mp3",
                "-filter_complex", "amix=inputs=2:duration=first:dropout_transition=2",
                "-c:v", "copy",
                "-c:a", "aac",
                "output.mp4"
            ]);

            // 4. Download
            const data = await ffmpeg.readFile("output.mp4");
            const url = URL.createObjectURL(new Blob([(data as any).buffer], { type: "video/mp4" }));
            
            const link = document.createElement("a");
            link.href = url;
            link.download = `lotus-motion-comic-${sessionId}-${Date.now()}.mp4`;
            link.click();

            setStatus("done");
            setTimeout(() => setStatus("idle"), 5000);

        } catch (err) {
            console.error("Export Error:", err);
            setStatus("error");
        }
    };

    return (
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <button
                className={`glow-box ${status === "processing" ? "animate-pulse" : ""}`}
                onClick={exportMovie}
                disabled={status === "loading" || status === "processing"}
                style={{
                    background: status === "done" ? "var(--color-success)" : "rgba(255,255,255,0.05)",
                    border: "1px solid",
                    borderColor: status === "done" ? "var(--color-success)" : "var(--border-subtle)",
                    color: status === "done" ? "#000" : "var(--gold-bright)",
                    padding: "10px 20px",
                    borderRadius: "30px",
                    display: "flex",
                    alignItems: "center",
                    gap: "8px",
                    fontSize: "13px",
                    fontWeight: 600,
                    cursor: (status === "loading" || status === "processing") ? "wait" : "pointer",
                }}
            >
                {status === "idle" && (
                    <>
                        <MovieIcon size={18} />
                        EXPORT MOTION COMIC (8D AUDIO)
                    </>
                )}
                {status === "loading" && (
                    <>
                        <RefreshIcon size={18} className="animate-spin" />
                        CALIBRATING 8D AUDIO...
                    </>
                )}
                {status === "processing" && (
                    <>
                        <RefreshIcon size={18} className="animate-spin" />
                        RENDERING ANIMATIC ({progress}%)
                    </>
                )}
                {status === "done" && (
                    <>
                        <Tick01Icon size={18} />
                        MOTION COMIC SAVED
                    </>
                )}
                {status === "error" && "EXPORT FAILED"}
            </button>
            
            {status === "processing" && (
                <div style={{
                    fontSize: "10px",
                    fontFamily: "var(--font-mono)",
                    color: "var(--gold-dim)",
                    textTransform: "uppercase",
                    letterSpacing: "0.1em"
                }}>
                    Baking Ken Burns...
                </div>
            )}
        </div>
    );
}
