"use client";

import React, { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import "locomotive-scroll/dist/locomotive-scroll.css";

function page() {
    const router = useRouter();
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
            className="relative flex w-full flex-col items-center overflow-visible bg-o-header text-o-white"
        >
            <div className="relative flex h-[800px] w-full justify-center overflow-hidden">
                <div
                    className="absolute inset-0 bg-[url('/swirl.png')] bg-cover bg-center opacity-40"
                    data-scroll
                    data-scroll-speed="-1.0"
                />
                <div className="absolute left-1/2 top-[490px] z-40 -translate-x-1/2">
                    <img
                        src="/chase.png"
                        alt="Chase"
                        className="w-[500px] object-contain"
                        data-scroll
                        data-scroll-speed="1.0"
                    />
                </div>
                <div className="absolute left-1/2 top-[350px] z-30 -translate-x-1/2 translate-x-[-640px] scale-[130%]">
                    <img
                        src="/kendrick.png"
                        alt="Kendrick"
                        className="w-[500px] object-contain"
                        data-scroll
                        data-scroll-speed="0.2"
                    />
                </div>
                <div className="absolute left-1/2 top-[380px] z-30 -translate-x-1/2 translate-x-[-50px] scale-[100%]">
                    <img
                        src="/target.png"
                        alt="Target"
                        className="w-[500px] object-contain"
                        data-scroll
                        data-scroll-speed="0.3"
                    />
                </div>
                <div className="absolute left-1/2 top-[350px] z-40 -translate-x-1/2 translate-x-[270px] scale-[90%]">
                    <img
                        src="/warning.png"
                        alt="Warning"
                        className="w-[500px] object-contain"
                        data-scroll
                        data-scroll-speed="0.6"
                    />
                </div>
                {/* Browser Box */}
                <div className="z-10 mt-6 box-border h-[1000px] w-[1300px] flex-col justify-center rounded-2xl border border-o-outline bg-o-header px-[12px]">
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
                            Automated Bug Detection & Resolution <br />
                            Integrated Seamlessly with your Codebase
                            {/* </MaskTextSplit> */}
                        </span>
                        <span className="z-20 mt-4 text-2xl text-o-muted">
                            Omni's AI agents discover, validate, and resolve
                            critical edge cases and <br />
                            infrastructure failures before they reach
                            production.
                        </span>
                        <Button className="z-10 mt-6 w-max rounded-full px-4" onClick={() => router.push("/")}>
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
            <div className="z-40 flex min-h-screen w-full flex-col items-center border-t border-o-outline bg-o-background">
                {/* Stats Section */}
                <div className="relative w-full max-w-[1200px] px-4 py-24">
                    <div className="relative z-10 mt-12 grid grid-cols-3 gap-8">
                        <div className="relative box-border flex w-full flex-col items-center justify-start overflow-hidden rounded-md border border-o-outline bg-o-background-light p-4">
                            <div className="absolute inset-0 z-0 bg-[url('/dots.svg')] bg-repeat opacity-80" />
                            <div className="flex flex-col">
                                <span
                                    className="z-10 text-6xl leading-tight"
                                    style={{
                                        fontVariationSettings:
                                            '"wght" 400, "wdth" 130',
                                    }}
                                >
                                    3.65M/yr
                                </span>
                                <span className="z-10 text-lg text-o-muted-light">
                                    AI-driven sites
                                </span>
                            </div>
                        </div>
                        <div className="relative box-border flex w-full flex-col items-center justify-start overflow-hidden rounded-md border border-o-outline bg-o-background-light p-4">
                            <div className="absolute inset-0 z-0 bg-[url('/dots.svg')] bg-repeat opacity-80" />
                            <div className="flex flex-col">
                                <span
                                    className="z-10 text-6xl leading-tight"
                                    style={{
                                        fontVariationSettings:
                                            '"wght" 400, "wdth" 130',
                                    }}
                                >
                                    2.10B/yr
                                </span>
                                <span className="z-10 text-lg text-o-muted-light">
                                    Hours spent QA testing
                                </span>
                            </div>
                        </div>
                        <div className="relative box-border flex w-full flex-col items-center justify-start overflow-hidden rounded-md border border-o-outline bg-o-background-light p-4">
                            <div className="absolute inset-0 z-0 bg-[url('/dots.svg')] bg-repeat opacity-80" />
                            <div className="flex flex-col">
                                <span
                                    className="z-10 text-6xl leading-tight"
                                    style={{
                                        fontVariationSettings:
                                            '"wght" 400, "wdth" 130',
                                    }}
                                >
                                    $10B/yr+
                                </span>
                                <span className="z-10 text-lg text-o-muted-light">
                                    Cost in Failure
                                </span>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 mt-12 grid grid-cols-2 gap-8">
                        <span
                            className="text-4xl leading-tight"
                            style={{
                                fontVariationSettings: '"wght" 400, "wdth" 130',
                            }}
                        >
                            Our Mission
                        </span>
                        <span className="text-xl text-o-muted">
                            eliminate catastrophic, concurrency-driven failures
                            before they reach production by introducing a new
                            paradigm of parallelized, agentic resilience testing
                            that mirrors real-world chaos—so engineering teams
                            can ship with confidence, not fear.
                        </span>
                    </div>

                    <img
                        src="/swarm.png"
                        className="mt-12 box-border w-full rounded-md border border-o-outline"
                    />
                    <div className="relative z-10 mt-12 grid grid-cols-2 gap-8">
                        <div className="flex">
                            <span
                                className="text-4xl leading-tight"
                                style={{
                                    fontVariationSettings:
                                        '"wght" 400, "wdth" 130',
                                }}
                            >
                                Natural Testing at Scale
                            </span>
                        </div>
                        <span className="justify-start text-xl text-o-muted">
                            Our AI agents work tirelessly to discover and
                            validate edge cases, ensuring your application
                            remains robust and reliable in production.
                        </span>
                    </div>

                    {/* Features Grid */}
                    <div className="mt-12 grid grid-cols-2 gap-8">
                        <div className="relative box-border flex w-full flex-col items-center justify-start overflow-hidden rounded-md border border-o-outline bg-o-background-light p-4">
                            <div className="absolute inset-0 z-0 bg-[url('/dots.svg')] bg-repeat opacity-80" />
                            <div className="flex flex-col">
                                <span
                                    className="z-10 text-6xl leading-tight"
                                    style={{
                                        fontVariationSettings:
                                            '"wght" 400, "wdth" 130',
                                    }}
                                >
                                    16-64
                                </span>
                                <span className="z-10 text-lg text-o-muted-light">
                                    Concurrent Agents
                                </span>
                            </div>
                        </div>
                        <div className="relative box-border flex w-full flex-col items-center justify-start overflow-hidden rounded-md border border-o-outline bg-o-background-light p-4">
                            <div className="absolute inset-0 z-0 bg-[url('/dots.svg')] bg-repeat opacity-80" />
                            <div className="flex flex-col">
                                <span
                                    className="z-10 text-6xl leading-tight"
                                    style={{
                                        fontVariationSettings:
                                            '"wght" 400, "wdth" 130',
                                    }}
                                >
                                    24/7
                                </span>
                                <span className="z-10 text-lg text-o-muted-light">
                                    Continuous Monitoring
                                </span>
                            </div>
                        </div>
                        <div className="relative box-border flex w-full flex-col items-center justify-start overflow-hidden rounded-md border border-o-outline bg-o-background-light p-4">
                            <div className="absolute inset-0 z-0 bg-[url('/dots.svg')] bg-repeat opacity-80" />
                            <div className="flex flex-col">
                                <span
                                    className="z-10 text-6xl leading-tight"
                                    style={{
                                        fontVariationSettings:
                                            '"wght" 400, "wdth" 130',
                                    }}
                                >
                                    5min
                                </span>
                                <span className="z-10 text-lg text-o-muted-light">
                                    Average Fix Time
                                </span>
                            </div>
                        </div>
                        <div className="relative box-border flex w-full flex-col items-center justify-start overflow-hidden rounded-md border border-o-outline bg-o-background-light p-4">
                            <div className="absolute inset-0 z-0 bg-[url('/dots.svg')] bg-repeat opacity-80" />
                            <div className="flex flex-col">
                                <span
                                    className="z-10 text-6xl leading-tight"
                                    style={{
                                        fontVariationSettings:
                                            '"wght" 400, "wdth" 130',
                                    }}
                                >
                                    50+
                                </span>
                                <span className="z-10 text-lg text-o-muted-light">
                                    Tests Generated
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="h-[200px] w-full bg-o-background"></div>
        </div>
    );
}

export default page;
