import { useState } from "react";
import { BACKEND_URL } from "@/lib/globals";
import { toast } from "sonner";

export type EventData = {
    type: string;
    content: string;
    streamId?: string;
    timeStamp: number;
};

export type StreamsEventData = {
    [streamId: string]: EventData[];
};

export function useCommandStream({
    setRunId,
}: {
    setRunId: (runId: string) => void;
}) {
    const [eventData, setEventData] = useState<StreamsEventData>({});

    const sendCommand = async (
        command: string[],
        id: string | undefined,
        streamId: string
    ) => {
        console.log("Sending command", command, id, streamId);
        try {
            const response = await fetch(`${BACKEND_URL}/run_command`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ commands: command, run_id: id }),
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            const reader = response.body?.getReader();
            if (!reader) return;

            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                // Convert the Uint8Array to text
                const text = new TextDecoder().decode(value);
                const data = text.split("data: ");

                for (const item of data) {
                    if (!item.trim()) {
                        continue;
                    }

                    // Extract type and content using regex
                    const typeMatch =
                        item.match(/'type':\s*'([^']*)'/) ||
                        item.match(/'type':\s*"([^"]*)"/) ||
                        [];
                    const contentMatch =
                        item.match(/'content':\s*'([^']*)'/) ||
                        item.match(/'content':\s*"([^"]*)"/) ||
                        [];
                    const idMatch =
                        item.match(/'id':\s*'([^']*)'/) ||
                        item.match(/'id':\s*"([^"]*)"/) ||
                        [];

                    if (typeMatch[1] === "uuid" && idMatch[1]) {
                        setRunId(idMatch[1]);
                        continue;
                    }

                    if (typeMatch[1] !== "log") {
                        continue;
                    }

                    if (typeMatch[1] && contentMatch[1]) {
                        const eventData = {
                            type: typeMatch[1],
                            content: contentMatch[1],
                            streamId,
                            timeStamp: Date.now(),
                        };

                        setEventData((prev) => ({
                            ...prev,
                            [streamId]: [...(prev[streamId] || []), eventData],
                        }));
                    } else {
                        console.log("Failed to parse:", item);
                        toast.warning("Error parsing event data");
                    }
                }
            }
        } catch (error) {
            console.error("Error:", error);
        }
    };

    return {
        eventData,
        sendCommand,
        clearEvents: () => setEventData({}),
        clearStreamEvents: (streamId: string) =>
            setEventData((prev) => {
                const newData = { ...prev };
                delete newData[streamId];
                return newData;
            }),
    };
}
