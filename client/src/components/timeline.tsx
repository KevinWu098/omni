"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";

const agents = [
    {
        id: "1",
        name: "Agent 1",
        events: [{ id: "1", type: "action", timestamp: 1000 }],
    },
    {
        id: "2",
        name: "Agent 2",
        events: [
            { id: "1", type: "action", timestamp: 2500 },
            { id: "2", type: "action", timestamp: 5800 },
            { id: "3", type: "action", timestamp: 8900 },
        ],
    },
    {
        id: "3",
        name: "Agent 3",
        events: [
            { id: "1", type: "action", timestamp: 1500 },
            { id: "2", type: "action", timestamp: 4200 },
            { id: "3", type: "action", timestamp: 7300 },
            { id: "4", type: "action", timestamp: 9500 },
        ],
    },
    ...Array(12).fill({
        id: "1",
        name: "Agent 1",
        events: [
            { id: "1", type: "action", timestamp: 3100 },
            { id: "2", type: "action", timestamp: 6400 },
            { id: "3", type: "action", timestamp: 9800 },
        ],
    }),
];

export function Timeline() {
    const containerRef = useRef<HTMLDivElement>(null);
    const allEvents = agents.flatMap((agent) => agent.events);
    const minTimestamp = 0;
    const maxTimestamp =
        Math.max(...allEvents.map((event) => event.timestamp)) + 5000;

    const duration = maxTimestamp - minTimestamp;

    const [currentTime, setCurrentTime] = useState(minTimestamp);
    const [isPlaying, setIsPlaying] = useState(true);

    const getPositionPercentage = (timestamp: number) => {
        return ((timestamp - minTimestamp) / duration) * 100;
    };

    // Auto-scroll effect
    useEffect(() => {
        if (!containerRef.current || !isPlaying) return;

        const container = containerRef.current;
        const currentPosition = getPositionPercentage(currentTime);
        const scrollPosition = (container.scrollWidth * currentPosition) / 100;

        // Smooth scroll to keep the current time indicator visible
        container.scrollTo({
            left: Math.max(0, scrollPosition - container.clientWidth / 3),
            behavior: "smooth",
        });
    }, [currentTime, isPlaying]);

    // Animate the timeline
    useEffect(() => {
        if (!isPlaying) return;

        const interval = setInterval(() => {
            setCurrentTime((prevTime) => {
                const newTime = prevTime + 100; // Advance by 100ms each frame
                if (newTime >= maxTimestamp) {
                    setIsPlaying(false);
                    return maxTimestamp;
                }
                return newTime;
            });
        }, 50); // Update every 50ms for smooth animation

        return () => clearInterval(interval);
    }, [isPlaying, maxTimestamp]);

    return (
        <div
            ref={containerRef}
            className="flex h-full w-full flex-col overflow-hidden overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
            <div
                style={{ width: `max(100%, ${duration / 10}px)` }}
                className="h-full"
            >
                <div className="relative">
                    {/* Display timestamp markers every 5 seconds */}
                    <div className="flex h-8 w-full justify-between">
                        {/* Major time indicators every 5 seconds */}
                        {Array.from({
                            length: Math.ceil(duration / 5000) + 1,
                        }).map((_, i) => {
                            const timestamp = minTimestamp + i * 5000;
                            if (timestamp > maxTimestamp) return null;

                            const seconds = Math.floor(
                                (timestamp - minTimestamp) / 1000
                            );
                            const timeStr = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}:00`;

                            return (
                                <div
                                    key={timestamp}
                                    className="relative"
                                    style={{
                                        position: "absolute",
                                        left: `${getPositionPercentage(timestamp)}%`,
                                        transform: "translateX(-50%)",
                                    }}
                                >
                                    <div className="text-o-muted translate-x-1/2 text-xs">
                                        {timeStr}
                                    </div>
                                    <div className="bg-o-muted-dark absolute left-1/2 top-full h-6 w-[1px] -translate-x-1/2" />
                                </div>
                            );
                        })}

                        {/* Medium grid lines every 1 second */}
                        {Array.from({
                            length: Math.ceil(duration / 1000),
                        }).map((_, i) => {
                            const timestamp = minTimestamp + i * 1000;
                            if (
                                timestamp % 5000 === 0 ||
                                timestamp > maxTimestamp
                            )
                                return null;

                            return (
                                <div
                                    key={`medium-${timestamp}`}
                                    className="absolute bottom-1/4 translate-y-full"
                                    style={{
                                        left: `${getPositionPercentage(timestamp)}%`,
                                    }}
                                >
                                    <div className="bg-o-muted-dark absolute left-1/2 top-full h-4 w-[1px] -translate-x-1/2" />
                                </div>
                            );
                        })}

                        {/* Minor grid lines every 200ms */}
                        {Array.from({
                            length: Math.ceil(duration / 200),
                        }).map((_, i) => {
                            const timestamp = minTimestamp + i * 200;
                            if (
                                timestamp % 1000 === 0 ||
                                timestamp > maxTimestamp
                            )
                                return null;

                            return (
                                <div
                                    key={`minor-${timestamp}`}
                                    className="absolute bottom-0 translate-y-full"
                                    style={{
                                        left: `${getPositionPercentage(timestamp)}%`,
                                    }}
                                >
                                    <div className="bg-o-muted-dark absolute left-1/2 top-full h-2 w-[1px] -translate-x-1/2" />
                                </div>
                            );
                        })}
                    </div>

                    {/* Current time indicator */}
                    <div
                        className="duration-50 absolute bottom-0 top-0 w-0.5 bg-blue-500 transition-transform"
                        style={{
                            left: `${getPositionPercentage(currentTime)}%`,
                            transform: "translateX(-50%)",
                            height: `${agents.length * 2}rem`,
                        }}
                    />
                </div>

                <div className="border-o-background relative mt-2 flex h-full flex-col border-t-2 pb-2 pt-8">
                    {/* 5-second interval vertical lines */}
                    <div className="pointer-events-none absolute inset-0 z-20">
                        {Array.from({
                            length: Math.ceil(duration / 5000) + 1,
                        }).map((_, i) => {
                            const timestamp = minTimestamp + i * 5000;
                            if (timestamp > maxTimestamp) return null;

                            return (
                                <div
                                    key={`vertical-${timestamp}`}
                                    className="border-o-outline absolute z-50 box-border h-[calc(100%)] -translate-x-1/2 border-l border-dashed"
                                    style={{
                                        left: `${getPositionPercentage(timestamp)}%`,
                                    }}
                                />
                            );
                        })}
                    </div>
                    <ScrollArea className="h-full">
                        <div className="flex h-full flex-col gap-y-4 py-1 pb-2">
                            {agents.map((agent, index) => (
                                <div
                                    key={`${agent.id}-${agent.name}-${index}`}
                                    className="relative"
                                >
                                    <div className="bg-o-muted-medium h-[2px] w-full" />
                                    {agent.events.map((event) => {
                                        const isNear =
                                            Math.abs(
                                                event.timestamp - currentTime
                                            ) < 500;
                                        const isPast =
                                            event.timestamp <= currentTime;
                                        return (
                                            <div
                                                key={event.id + index}
                                                className={`absolute -top-[5px] h-[6px] w-2 translate-y-1/2 transition-all duration-200 ${
                                                    isPast
                                                        ? "bg-blue-500"
                                                        : "bg-o-muted-medium"
                                                } ${
                                                    isNear
                                                        ? "scale-150"
                                                        : "scale-100"
                                                }`}
                                                style={{
                                                    left: `${getPositionPercentage(event.timestamp)}%`,
                                                    opacity: isPast
                                                        ? isNear
                                                            ? 0.8
                                                            : 1
                                                        : 0,
                                                }}
                                            />
                                        );
                                    })}
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                </div>
            </div>
        </div>
    );
}
