"use client";

import { useEffect, useRef, useState } from "react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { StreamsEventData } from "@/lib/hooks/use-command-stream";
import { cn } from "@/lib/utils";
import { PentagonIcon } from "lucide-react";

type Event = {
    id: string;
    type: string;
    timestamp: number;
};

type Agent = {
    id: string;
    name: string;
    events: Event[];
};

export function Timeline({ eventData }: { eventData: StreamsEventData }) {
    const containerRef = useRef<HTMLDivElement>(null);

    // Convert StreamsEventData to Agent[]
    const agents: Agent[] = Object.entries(eventData).map(
        ([streamId, events]) => ({
            id: streamId,
            name: `Stream ${streamId}`,
            events: events.map((event, index) => ({
                id: index.toString(),
                type: event.type,
                timestamp: event.timeStamp,
            })),
        })
    );

    const allEvents = agents.flatMap((agent) => agent.events);
    const minTimestamp =
        allEvents.length > 0
            ? Math.min(...allEvents.map((e) => e.timestamp))
            : 0;
    const maxTimestamp =
        allEvents.length > 0
            ? Math.max(...allEvents.map((e) => e.timestamp)) + 5000
            : minTimestamp + 5000;

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
            className={cn(
                "flex h-full w-full flex-col overflow-hidden overflow-x-auto px-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
                "pointer-events-none"
            )}
        >
            <div
                style={{ width: `max(100%, ${duration / 20}px)` }}
                className="h-full"
            >
                <div className="relative">
                    {/* Display timestamp markers every 2.5 seconds */}
                    <div className="flex h-5 w-full justify-between">
                        {/* Major time indicators every 2.5 seconds */}
                        {Array.from({
                            length: Math.ceil(duration / 2500) + 1,
                        }).map((_, i) => {
                            const timestamp = minTimestamp + i * 2500;
                            if (timestamp > maxTimestamp) return null;

                            const seconds = Math.floor(
                                (timestamp - minTimestamp) / 1000
                            );
                            const milliseconds = Math.floor(
                                ((timestamp - minTimestamp) % 1000) / 10
                            )
                                .toString()
                                .padStart(2, "0");
                            const timeStr = `${String(Math.floor(seconds / 60)).padStart(2, "0")}:${String(seconds % 60).padStart(2, "0")}:${milliseconds}:00`;

                            return (
                                <div
                                    key={timestamp}
                                    className="relative font-medium"
                                    style={{
                                        position: "absolute",
                                        left: `${getPositionPercentage(timestamp)}%`,
                                        transform: "translateX(-50%)",
                                    }}
                                >
                                    <div className="text-o-muted translate-x-1/2 text-[10px]">
                                        {timeStr}
                                    </div>
                                    <div className="bg-o-muted-dark absolute left-1/2 top-4 h-3 w-[1px] -translate-x-1/2" />
                                </div>
                            );
                        })}

                        {/* Medium grid lines every 500ms */}
                        {Array.from({
                            length: Math.ceil(duration / 500),
                        }).map((_, i) => {
                            const timestamp = minTimestamp + i * 500;
                            if (
                                timestamp % 2500 === 0 ||
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
                                    <div className="bg-o-muted-dark absolute left-1/2 top-[6px] h-2 w-[1px] -translate-x-1/2" />
                                </div>
                            );
                        })}

                        {/* Minor grid lines every 100ms */}
                        {Array.from({
                            length: Math.ceil(duration / 100),
                        }).map((_, i) => {
                            const timestamp = minTimestamp + i * 100;
                            if (
                                timestamp % 500 === 0 ||
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
                                    <div className="bg-o-muted-dark absolute left-1/2 top-1 h-1 w-[1px] -translate-x-1/2" />
                                </div>
                            );
                        })}
                    </div>

                    {/* Current time indicator */}
                    <div className="relative z-10">
                        <div
                            className="duration-50 bg-o-primary absolute bottom-0 top-0 w-0.5 transition-transform"
                            style={{
                                left: `${getPositionPercentage(currentTime)}%`,
                                transform: "translateX(-50%)",
                                height: `${agents.length * 2}rem`,
                            }}
                        />
                        <PentagonIcon
                            className="fill-o-primary text-o-primary absolute top-0 size-4 -translate-x-1/2 -translate-y-1/3 rotate-180"
                            style={{
                                left: `${getPositionPercentage(currentTime)}%`,
                            }}
                        />
                    </div>
                </div>

                <div className="border-o-background relative mt-2 flex h-full flex-col border-t-2 pb-2 pt-5">
                    {/* 5-second interval vertical lines */}
                    <div className="pointer-events-none absolute inset-0 z-20">
                        {Array.from({
                            length: Math.ceil(duration / 2500) + 1,
                        }).map((_, i) => {
                            const timestamp = minTimestamp + i * 2500;
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
                                    <div className="bg-o-muted-dark h-[2px] w-full" />
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
                                                        ? "bg-o-muted-medium"
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
