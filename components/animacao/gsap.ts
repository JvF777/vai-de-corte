"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { SplitText } from "gsap/SplitText";
import { useGSAP } from "@gsap/react";

// Registro único dos plugins usados no projeto.
gsap.registerPlugin(useGSAP, ScrollTrigger, SplitText);

gsap.defaults({ ease: "power3.out", duration: 0.6 });

export const SEM_MOVIMENTO = "(prefers-reduced-motion: reduce)";
export const COM_MOVIMENTO = "(prefers-reduced-motion: no-preference)";

export { gsap, ScrollTrigger, SplitText, useGSAP };
