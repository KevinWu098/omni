"use client";

import { useEffect, useRef, useState } from "react";
import { BACKEND_URL } from "@/lib/globals";
import { cn } from "@/lib/utils";
import Hls from "hls.js";

interface VideoProps {
    runId: string;
}

export function Video({ runId }: VideoProps) {
    const [live, setLive] = useState(true);
    const [webrtcStatus, setWebrtcStatus] = useState("");
    const [timeInfo, setTimeInfo] = useState("");
    const hlsVideoRef = useRef<HTMLVideoElement>(null);
    const webrtcVideoRef = useRef<HTMLVideoElement>(null);
    const pcRef = useRef<RTCPeerConnection | null>(null);
    const hlsRef = useRef<Hls | null>(null);

    const base = `/stream/${runId}`;

    const updateTimeDisplay = () => {
        const video = hlsVideoRef.current;
        if (!video) return;

        const currentTime = video.currentTime || 0;
        const duration = video.duration || 0;

        const formatTime = (seconds: number) => {
            const minutes = Math.floor(seconds / 60);
            const secs = Math.floor(seconds % 60);
            return `${minutes}:${secs.toString().padStart(2, "0")}`;
        };

        setTimeInfo(
            live ? `${formatTime(currentTime)} / ${formatTime(duration)}` : ""
        );
    };

    const enforceLiveMode = () => {
        if (!live || !hlsRef.current || !hlsVideoRef.current) return;

        const video = hlsVideoRef.current;
        const duration = video.duration;

        if (duration && duration > 0) {
            const livePosition = hlsRef.current.liveSyncPosition;
            video.currentTime =
                livePosition !== null && livePosition > 0
                    ? livePosition
                    : duration;
        }

        if (video.paused) {
            video.play().catch(() => {});
        }
    };

    const startWebRTC = async () => {
        if (pcRef.current) {
            try {
                pcRef.current.close();
            } catch (e) {}
        }

        const pc = new RTCPeerConnection({ iceServers: [] });
        pcRef.current = pc;
        setWebrtcStatus("webrtc: connecting");

        pc.onconnectionstatechange = () => {
            setWebrtcStatus(`webrtc: ${pc.connectionState}`);
            if (
                ["disconnected", "failed", "closed"].includes(
                    pc.connectionState
                )
            ) {
                setTimeout(startWebRTC, 2000);
            }
        };

        pc.ontrack = (e) => {
            if (webrtcVideoRef.current && e.streams[0]) {
                webrtcVideoRef.current.srcObject = e.streams[0] as any;
                webrtcVideoRef.current.play().catch(() => {});
            }
        };

        try {
            const offer = await pc.createOffer({ offerToReceiveVideo: true });
            await pc.setLocalDescription(offer);

            const res = await fetch(`${BACKEND_URL}${base}/offer`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    sdp: pc.localDescription?.sdp,
                    type: pc.localDescription?.type,
                }),
            });

            const data = await res.json();
            if (res.ok && !data.error) {
                await pc.setRemoteDescription(data);
            }
        } catch (e) {
            setTimeout(startWebRTC, 2000);
        }
    };

    const toggleLiveMode = () => {
        if (live) {
            // Switch to WebRTC mode
            hlsRef.current?.stopLoad();
            hlsRef.current?.detachMedia();
            startWebRTC();
        } else {
            // Switch to HLS mode
            if (webrtcVideoRef.current) {
                webrtcVideoRef.current.srcObject = null;
            }
            if (pcRef.current) {
                try {
                    pcRef.current.close();
                } catch (e) {}
                pcRef.current = null;
            }
            setWebrtcStatus("");

            if (hlsRef.current && hlsVideoRef.current) {
                hlsRef.current.loadSource(
                    `${BACKEND_URL}${base}/playlist.m3u8`
                );
                hlsRef.current.attachMedia(hlsVideoRef.current);
            }
        }
        updateTimeDisplay();
    };

    useEffect(() => {
        if (!runId) return;

        const hls = new Hls({
            enableWorker: true,
            lowLatencyMode: true,
            backBufferLength: 90,
            liveSyncDuration: 1,
            liveMaxLatencyDuration: 5,
            liveDurationInfinity: true,
            maxBufferLength: 2,
            maxMaxBufferLength: 4,
        });

        hlsRef.current = hls;

        // Set up initial mode
        toggleLiveMode();

        // Cleanup
        return () => {
            hls.destroy();
            if (pcRef.current) {
                try {
                    pcRef.current.close();
                } catch (e) {}
            }
        };
    }, [runId]);

    useEffect(() => {
        toggleLiveMode();
    }, [live]);

    useEffect(() => {
        const interval = setInterval(updateTimeDisplay, 1000);
        return () => clearInterval(interval);
    }, [live]);

    if (!runId) {
        return <p className="text-white">Missing run_id</p>;
    }

    return (
        <div className="bg-o-background text-o-white h-[calc(100%-32px)]">
            <div className="flex items-center gap-2">
                <button
                    onClick={() => setLive(!live)}
                    className="px-1.5 py-0.5"
                >
                    {live ? "LIVE" : "DVR"}
                </button>
                {webrtcStatus && live && (
                    <span className="ml-2 text-green-500">{webrtcStatus}</span>
                )}
                <div className="ml-auto text-xs text-gray-400">{timeInfo}</div>
            </div>

            <div className="h-[calc(100%-28px)]">
                <video
                    ref={hlsVideoRef}
                    playsInline
                    muted
                    controls={!live}
                    className={cn("aspect-video h-full w-full", {
                        hidden: live,
                    })}
                />
                <video
                    ref={webrtcVideoRef}
                    autoPlay
                    muted
                    playsInline
                    className={cn("aspect-video h-full w-full", {
                        hidden: !live,
                        "pointer-events-none": live,
                    })}
                />
            </div>
        </div>
    );
}
