"use client";

import { ReactNode, useRef } from "react";
import { useGSAP } from "@gsap/react";
import gsap from "gsap-trial";
import { ScrollTrigger } from "gsap-trial/ScrollTrigger";
import { SplitText } from "gsap-trial/SplitText";

gsap.registerPlugin(ScrollTrigger, SplitText);

interface MaskTextProps {
    children?: ReactNode;
    className?: string;
    splitType?: "words" | "lines";
}

const MaskTextSplit: React.FC<MaskTextProps> = ({
    children = "",
    className = "",
    splitType = "words",
}) => {
    const textRef = useRef<HTMLDivElement>(null);

    useGSAP(
        () => {
            if (!textRef.current) return;

            const elements = Array.from(textRef.current.children);

            elements.forEach((element) => {
                const splitText = new SplitText(element, {
                    type: "lines,words",
                });

                splitText.lines.forEach((line) => {
                    line.classList.add("overflow-hidden");

                    if (splitType === "lines") {
                        const innerWrapper = document.createElement("div");
                        innerWrapper.innerHTML = line.innerHTML;
                        line.innerHTML = "";
                        line.appendChild(innerWrapper);
                    }
                });

                const targets =
                    splitType === "words"
                        ? splitText.words
                        : (Array.from(splitText.lines).map(
                              (line) => line.firstChild
                          ) as HTMLElement[]);

                gsap.set(targets, { y: "100%" });
                gsap.set(textRef.current, { autoAlpha: 1 });
                gsap.to(targets, {
                    y: "0%",
                    stagger: 0.04,
                    duration: 1,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: textRef.current,
                        start: "top 80%",
                        end: "bottom 60%",
                        toggleActions: "play none none none",
                    },
                });
            });
        },
        { scope: textRef, dependencies: [children, splitType] }
    );

    return (
        <div
            ref={textRef}
            className={`${className} invisible`}
        >
            {children}
        </div>
    );
};

export default MaskTextSplit;
