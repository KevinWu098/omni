"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";

import "locomotive-scroll/dist/locomotive-scroll.css";

function page() {
    useEffect(() => {
        (async () => {
            const LocomotiveScroll = (await import("locomotive-scroll"))
                .default;
            const locomotiveScroll = new LocomotiveScroll();
        })();
    }, []);

    return (
        <div
            data-scroll-container
            className="relative flex min-h-screen w-full flex-col items-center overflow-visible bg-o-header text-o-white"
        >
            <div className="relative flex h-[2000px] w-full justify-center">
                <div
                    className="absolute inset-0 bg-[url('/swirl.png')] bg-cover bg-center opacity-40"
                    data-scroll
                    data-scroll-speed="-1.0"
                />
                <div className="absolute left-1/2 top-[470px] z-40 -translate-x-1/2">
                    <img
                        src="/chase.png"
                        alt="Chase"
                        className="w-[500px] object-contain"
                        data-scroll
                        data-scroll-speed="1.0"
                    />
                </div>
                <div className="absolute left-1/2 top-[330px] z-30 -translate-x-1/2 translate-x-[-640px] scale-[130%]">
                    <img
                        src="/kendrick.png"
                        alt="Kendrick"
                        className="w-[500px] object-contain"
                        data-scroll
                        data-scroll-speed="0.2"
                    />
                </div>
                <div className="absolute left-1/2 top-[360px] z-30 -translate-x-1/2 translate-x-[-50px] scale-[100%]">
                    <img
                        src="/target.png"
                        alt="Target"
                        className="w-[500px] object-contain"
                        data-scroll
                        data-scroll-speed="0.3"
                    />
                </div>
                <div className="absolute left-1/2 top-[330px] z-40 -translate-x-1/2 translate-x-[270px] scale-[90%]">
                    <img
                        src="/warning.png"
                        alt="Warning"
                        className="w-[500px] object-contain"
                        data-scroll
                        data-scroll-speed="0.6"
                    />
                </div>
                {/* Browser Box */}
                <div className="z-10 mt-6 box-border h-[800px] w-[1300px] flex-col justify-center rounded-2xl border border-o-outline bg-o-header px-[12px]">
                    {/* Browser Buttons */}
                    <div className="flex space-x-2 py-[14px]">
                        <div className="box-border h-4 w-4 rounded-full border border-o-outline" />
                        <div className="box-border h-4 w-4 rounded-full border border-o-outline" />
                        <div className="box-border h-4 w-4 rounded-full border border-o-outline" />
                    </div>
                    {/* Browser Content */}
                    <div className="relative box-border flex h-full w-full flex-col items-center rounded-lg border border-o-outline bg-[radial-gradient(circle_at_top_left,#191818,#131313)] text-center">
                        <div className="absolute inset-0 z-0 rounded-lg bg-[url('/dots.svg')] opacity-80" />
                        <span
                            style={{
                                fontVariationSettings: '"wght" 400, "wdth" 125',
                            }}
                            className="relative z-10 mt-12 text-5xl leading-[1.2]"
                        >
                            {/* <MaskTextSplit> */}
                            Automated Bug Detection & Fixing integrated
                            seamlessly with your codebase
                            {/* </MaskTextSplit> */}
                        </span>
                        <span className="mt-4 text-2xl text-o-muted">
                            Omni’s AI agents discover, validate, and resolve
                            critical edge cases and <br />
                            infrastructure failures before they reach
                            production.
                        </span>
                        <Button className="z-10 mt-6 w-max rounded-full px-4">
                            <span
                                style={{
                                    fontVariationSettings:
                                        '"wght" 500, "wdth" 130',
                                }}
                                className="relative z-10 text-lg"
                            >
                                Get Started
                            </span>
                        </Button>
                    </div>
                </div>
            </div>
            <div className="min-h-screen bg-red-500" />
        </div>
    );
}

export default page;
