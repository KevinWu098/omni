"use client";

import React, { useMemo, useState } from "react";
import { Tracks } from "@/components/runner/timeline/tracks";
import { Player } from "@remotion/player";

import type { Item } from "./types";

type Track = {
    name: string;
    items: Item[];
};

export const Editor = () => {
    const [tracks, setTracks] = useState<Track[]>([
        { name: "Track 1", items: [] },
        { name: "Track 2", items: [] },
    ]);

    const inputProps = useMemo(() => {
        return {
            tracks,
        };
    }, [tracks]);

    return (
        <>
            <Player
                component={Tracks}
                fps={30}
                inputProps={inputProps}
                durationInFrames={600}
                compositionWidth={1280}
                compositionHeight={720}
            />
        </>
    );
};
