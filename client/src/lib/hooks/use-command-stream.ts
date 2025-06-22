import { useState } from "react";
import { BACKEND_URL } from "@/lib/globals";

interface UseCommandStreamProps {
    command: string;
}

export function useCommandStream() {
    const [eventData, setEventData] = useState<string[]>([]);

    const sendCommand = async (command: string) => {
        try {
            const response = await fetch(`${BACKEND_URL}/run_command`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({ command }),
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
                setEventData((prev) => [...prev, text]);
            }
        } catch (error) {
            console.error("Error:", error);
        }
    };

    return {
        eventData,
        sendCommand,
        clearEvents: () => setEventData([]),
    };
}
