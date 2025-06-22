"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Tracks } from "@/components/runner/timeline/tracks";
import { Track } from "@/components/runner/timeline/types";
import { ScrollArea } from "@radix-ui/react-scroll-area";
import { Player, PlayerRef } from "@remotion/player";

// Constants for time scaling
const TOTAL_SECONDS = 60; // 1 minute
const CHUNK_SECONDS = 5; // 5-second chunks
const FPS = 30;
const TOTAL_FRAMES = TOTAL_SECONDS * FPS;
const CHUNK_WIDTH = 100; // Width in pixels for each 5-second chunk
const TOTAL_WIDTH = (TOTAL_SECONDS / CHUNK_SECONDS) * CHUNK_WIDTH;

export const Editor: React.FC = () => {
    const [tracks, setTracks] = useState<Track[]>([
        { name: "Track 1", items: [] },
        { name: "Track 2", items: [] },
    ]);
    const playerRef = useRef<PlayerRef>(null);
    const timelineRef = useRef<HTMLDivElement>(null);
    const [currentFrame, setCurrentFrame] = useState(0);

    const inputProps = useMemo(() => {
        return {
            tracks,
        };
    }, [tracks]);

    useEffect(() => {
        if (!playerRef.current) return;

        const onFrameUpdate = (e: { detail: { frame: number } }) => {
            setCurrentFrame(e.detail.frame);
            if (timelineRef.current) {
                const scrollPosition =
                    (e.detail.frame / TOTAL_FRAMES) * TOTAL_WIDTH;
                timelineRef.current.scrollLeft = scrollPosition;
            }
        };

        playerRef.current.addEventListener("frameupdate", onFrameUpdate);

        return () => {
            if (playerRef.current) {
                playerRef.current.removeEventListener(
                    "frameupdate",
                    onFrameUpdate
                );
            }
        };
    }, []);

    return (
        <>
            <Player
                ref={playerRef}
                component={Tracks}
                fps={FPS}
                inputProps={inputProps}
                durationInFrames={TOTAL_FRAMES}
                compositionWidth={1280}
                compositionHeight={720}
                autoPlay
                loop
            />
            <Timeline
                tracks={tracks}
                onTracksChange={setTracks}
                timelineRef={timelineRef}
                currentFrame={currentFrame}
            />
        </>
    );
};

interface TimelineContentProps {
    tracks: Track[];
    timelineRef: React.RefObject<HTMLDivElement | null>;
    currentFrame: number;
}

const TimelineContent = ({
    tracks,
    timelineRef,
    currentFrame,
}: TimelineContentProps) => {
    return (
        <div
            ref={timelineRef}
            className="relative overflow-x-auto"
            style={{ width: "100%" }}
        >
            <div style={{ width: `${TOTAL_WIDTH}px`, position: "relative" }}>
                {/* Time markers */}
                <div className="flex border-b border-gray-200">
                    {Array.from({ length: TOTAL_SECONDS / CHUNK_SECONDS }).map(
                        (_, i) => (
                            <div
                                key={i}
                                className="flex-none text-xs text-gray-500"
                                style={{ width: `${CHUNK_WIDTH}px` }}
                            >
                                {i * CHUNK_SECONDS}s
                            </div>
                        )
                    )}
                </div>

                {/* Playhead */}
                <div
                    className="absolute bottom-0 top-0 z-10 w-0.5 bg-red-500"
                    style={{
                        left: `${(currentFrame / TOTAL_FRAMES) * TOTAL_WIDTH}px`,
                        transform: "translateX(-50%)",
                    }}
                >
                    <div className="absolute -top-1 left-0 -translate-x-1/2">
                        <div className="h-3 w-3 rounded-full bg-red-500" />
                    </div>
                </div>

                {/* Tracks */}
                {tracks.map((track) => (
                    <div
                        key={track.name}
                        className="flex items-center gap-2 py-2"
                    >
                        <div className="w-24 flex-none font-medium">
                            {track.name}
                        </div>
                        <div className="relative h-12 flex-1 rounded-lg bg-gray-100">
                            {track.items.map((item) => (
                                <div
                                    key={item.id}
                                    className="absolute h-full rounded bg-blue-500"
                                    style={{
                                        left: `${(item.from / TOTAL_FRAMES) * TOTAL_WIDTH}px`,
                                        width: `${(item.durationInFrames / TOTAL_FRAMES) * TOTAL_WIDTH}px`,
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

interface TimelineProps {
    tracks: Track[];
    onTracksChange: (tracks: Track[]) => void;
    timelineRef: React.RefObject<HTMLDivElement | null>;
    currentFrame: number;
}

const Timeline = ({
    tracks,
    onTracksChange,
    timelineRef,
    currentFrame,
}: TimelineProps) => {
    return (
        <div className="mt-4 border-t border-gray-200">
            <ScrollArea className="h-[200px]">
                <TimelineContent
                    tracks={tracks}
                    timelineRef={timelineRef}
                    currentFrame={currentFrame}
                />
            </ScrollArea>
        </div>
    );
};
