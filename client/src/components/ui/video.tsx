/* app/components/VideoPlayer.tsx */
"use client";

import { useEffect, useRef, useState } from "react";
import { BACKEND_URL } from "@/lib/globals";
import { cn } from "@/lib/utils";
import Hls from "hls.js";
import { Loader2Icon } from "lucide-react";

export interface VideoPlayerProps {
    mode: "live" | "dvr";
    runId: string;
    multiple?: boolean;
}

/**
 * VideoPlayer component that supports both WebRTC (live) and HLS (DVR) playback modes.
 * WebRTC is used for low-latency live streaming, while HLS provides DVR capabilities.
 */
export function VideoPlayer({ mode, multiple, runId }: VideoPlayerProps) {
    // State for tracking playback mode and status
    const [live, setLive] = useState(mode === "live");
    const [webrtcStatus, setWebrtcStatus] = useState("");
    const [timeInfo, setTimeInfo] = useState("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        setLive(mode === "live");
    }, [mode]);

    // Refs for video elements and streaming instances
    const hlsVideoRef = useRef<HTMLVideoElement>(null);
    const webrtcVideoRef = useRef<HTMLVideoElement>(null);
    const hlsRef = useRef<Hls | null>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const retryTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    const base = `/stream/${runId}`;

    // Format time as MM:SS
    const formatTime = (seconds: number) =>
        `${Math.floor(seconds / 60)}:${Math.floor(seconds % 60)
            .toString()
            .padStart(2, "0")}`;

    // Update the time display in DVR mode
    const updateTimeDisplay = () => {
        const video = hlsVideoRef.current;
        if (!video) return;
        setTimeInfo(
            live
                ? `${formatTime(video.currentTime || 0)} / ${formatTime(video.duration || 0)}`
                : ""
        );
    };

    /**
     * Initialize and manage WebRTC connection for live streaming
     * Handles connection lifecycle, reconnection on failure, and stream attachment
     */
    const initializeWebRTC = async () => {
        setIsLoading(true);
        // Clear any existing retry timeout
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
        }

        // Cleanup existing connection if any
        if (pcRef.current) {
            try {
                pcRef.current.close();
            } catch (e) {
                console.warn("Error closing existing WebRTC connection:", e);
            }
            pcRef.current = null;
        }

        try {
            // Create new connection
            const pc = new RTCPeerConnection({
                iceServers: [], // Local connections don't need STUN/TURN servers
                iceCandidatePoolSize: 0,
            });
            pcRef.current = pc;
            setWebrtcStatus("webrtc: connecting");

            // Handle connection state changes
            pc.onconnectionstatechange = () => {
                console.log("WebRTC connection state:", pc.connectionState);
                setWebrtcStatus(`webrtc: ${pc.connectionState}`);

                if (pc.connectionState === "connected") {
                    setIsLoading(false);
                }

                if (
                    ["failed", "disconnected", "closed"].includes(
                        pc.connectionState
                    )
                ) {
                    // Only retry if we're still in live mode
                    if (live) {
                        console.log("Scheduling WebRTC reconnection...");
                        retryTimeoutRef.current = setTimeout(
                            initializeWebRTC,
                            2000
                        );
                    }
                }
            };

            // Handle ICE connection state changes
            pc.oniceconnectionstatechange = () => {
                console.log("ICE connection state:", pc.iceConnectionState);
            };

            // Log ICE gathering state changes
            pc.onicegatheringstatechange = () => {
                console.log("ICE gathering state:", pc.iceGatheringState);
            };

            // Handle ICE candidates
            pc.onicecandidate = (event) => {
                console.log("ICE candidate:", event.candidate);
            };

            // Attach incoming video stream
            pc.ontrack = (e) => {
                console.log("Received video track", e.streams);
                if (webrtcVideoRef.current && e.streams[0]) {
                    webrtcVideoRef.current.srcObject = e.streams[0];
                    webrtcVideoRef.current.play().catch(console.error);
                }
            };

            // Create and send offer to server
            const offer = await pc.createOffer({
                offerToReceiveVideo: true,
                offerToReceiveAudio: false,
            });

            await pc.setLocalDescription(offer);

            // Wait for ICE gathering to complete
            if (pc.iceGatheringState !== "complete") {
                await new Promise<void>((resolve) => {
                    const checkState = () => {
                        if (pc.iceGatheringState === "complete") {
                            pc.removeEventListener(
                                "icegatheringstatechange",
                                checkState
                            );
                            resolve();
                        }
                    };
                    pc.addEventListener("icegatheringstatechange", checkState);
                });
            }

            const response = await fetch(`${BACKEND_URL}${base}/offer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sdp: pc.localDescription?.sdp,
                    type: pc.localDescription?.type,
                }),
            });

            if (!response.ok) {
                throw new Error(
                    `Server returned ${response.status}: ${response.statusText}`
                );
            }

            const data = await response.json();
            if (data.error) {
                throw new Error(data.error);
            }

            // Set the remote description
            await pc.setRemoteDescription(new RTCSessionDescription(data));
            console.log("WebRTC connection established successfully");
        } catch (error) {
            console.error("WebRTC connection failed:", error);
            setWebrtcStatus("webrtc: failed");
            setIsLoading(false);

            // Only retry if we're still in live mode
            if (live) {
                retryTimeoutRef.current = setTimeout(initializeWebRTC, 2000);
            }
        }
    };

    /**
     * Switch between live (WebRTC) and DVR (HLS) modes
     * Handles cleanup and initialization of respective streaming methods
     */
    const switchPlaybackMode = (toLive: boolean) => {
        setIsLoading(true);
        // Clear any pending retry timeout
        if (retryTimeoutRef.current) {
            clearTimeout(retryTimeoutRef.current);
        }

        if (toLive) {
            // Switch to live mode (WebRTC)
            hlsRef.current?.stopLoad();
            hlsRef.current?.detachMedia();
            initializeWebRTC();
        } else {
            // Switch to DVR mode (HLS)
            // Cleanup WebRTC
            if (webrtcVideoRef.current) {
                webrtcVideoRef.current.srcObject = null;
            }
            if (pcRef.current) {
                pcRef.current.close();
                pcRef.current = null;
            }
            setWebrtcStatus("");

            // Initialize HLS
            if (hlsRef.current && hlsVideoRef.current) {
                const hls = hlsRef.current;
                const video = hlsVideoRef.current;

                hls.attachMedia(video);
                hls.loadSource(`${BACKEND_URL}${base}/playlist.m3u8`);

                hls.once(Hls.Events.MANIFEST_PARSED, () => {
                    video.play().catch(console.error);
                    setIsLoading(false);
                });
            }
        }

        updateTimeDisplay();
    };

    // Initialize HLS instance
    useEffect(() => {
        if (!runId) return;

        const hls = new Hls({
            lowLatencyMode: true,
            liveSyncDurationCount: 1,
            maxBufferLength: 2,
            maxMaxBufferLength: 4,
        });
        hlsRef.current = hls;

        // Set initial mode
        switchPlaybackMode(live);

        return () => {
            // Cleanup on unmount
            hls.destroy();
            if (pcRef.current) {
                pcRef.current.close();
            }
            if (retryTimeoutRef.current) {
                clearTimeout(retryTimeoutRef.current);
            }
        };
    }, [runId]);

    // Handle live/DVR mode changes
    useEffect(() => {
        switchPlaybackMode(live);
    }, [live]);

    // Update time display
    useEffect(() => {
        const intervalId = setInterval(updateTimeDisplay, 1000);
        return () => clearInterval(intervalId);
    }, [live]);

    // Auto-resume playback in live mode
    useEffect(() => {
        const video = hlsVideoRef.current;
        if (!video) return;

        const handlePause = () => {
            if (live && video.paused) {
                video.play().catch(console.error);
            }
        };

        video.addEventListener("pause", handlePause);
        return () => video.removeEventListener("pause", handlePause);
    }, [live]);

    if (!runId) return <p className="text-white">Missing run_id</p>;

    return (
        <div
            className={cn(
                "relative h-[calc(100%-32px)] select-none bg-o-background text-white",
                multiple && "my-auto flex h-full items-center justify-center"
            )}
        >
            {/* Video container */}
            <div
                className={cn(
                    "relative h-[calc(100%-28px)]",
                    multiple && "h-full"
                )}
            >
                {/* Loading state */}
                {isLoading && (
                    <div className="absolute inset-0 flex items-center justify-center bg-o-background/80">
                        <Loader2Icon className="animate-spin text-o-primary duration-500" />
                    </div>
                )}

                {/* HLS video for DVR mode */}
                <video
                    ref={hlsVideoRef}
                    playsInline
                    autoPlay
                    muted
                    controls={!live}
                    className={cn(
                        "aspect-video h-full w-full",
                        live && "hidden",
                        multiple && "w-fit max-w-fit"
                    )}
                />

                {/* WebRTC video for live mode */}
                <video
                    ref={webrtcVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className={cn(
                        "pointer-events-none aspect-video h-full w-full",
                        !live && "hidden",
                        multiple && "w-fit max-w-fit"
                    )}
                />
            </div>

            {!multiple && live && (
                <>
                    <div className="absolute bottom-6 left-4 w-fit rounded-sm bg-o-red px-2 py-1 text-xs font-semibold uppercase text-o-white">
                        Live
                    </div>

                    {timeInfo && (
                        <div className="absolute bottom-6 right-4 w-fit rounded-sm bg-o-background/80 px-2 py-1 text-base font-medium uppercase text-o-white">
                            {timeInfo}
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
