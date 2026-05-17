"use client";

import { useEffect, useRef, useState } from "react";

export default function CustomCursor() {
  const cursorRef = useRef<HTMLDivElement>(null);
  const pos   = useRef({ x: -200, y: -200 });
  const curr  = useRef({ x: -200, y: -200 });
  const raf   = useRef<number>(0);

  const [state, setState] = useState<"default" | "hover" | "click">("default");

  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      pos.current = { x: e.clientX, y: e.clientY };
    };

    const onOver = (e: MouseEvent) => {
      const el   = e.target as HTMLElement;
      const btn  = el.closest("button");
      const link = el.closest("a");

      if (btn || link) {
        setState("hover");
      } else {
        setState("default");
      }
    };

    const onDown = () => setState("click");
    const onUp   = () => setState((s) => (s === "click" ? "default" : s));

    window.addEventListener("mousemove", onMove,  { passive: true });
    window.addEventListener("mouseover", onOver,  { passive: true });
    window.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup",   onUp);

    /* Smooth lerp loop */
    const tick = () => {
      curr.current.x += (pos.current.x - curr.current.x) * 0.1;
      curr.current.y += (pos.current.y - curr.current.y) * 0.1;
      if (cursorRef.current) {
        cursorRef.current.style.transform =
          `translate(${curr.current.x}px, ${curr.current.y}px)`;
      }
      raf.current = requestAnimationFrame(tick);
    };
    raf.current = requestAnimationFrame(tick);

    return () => {
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("mouseover", onOver);
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup",   onUp);
      cancelAnimationFrame(raf.current);
    };
  }, []);

  /* Touch devices — don't render */
  if (typeof window !== "undefined" && window.matchMedia("(pointer:coarse)").matches) return null;

  const isHover = state === "hover";
  const isClick = state === "click";

  const size   = isClick ? 16 : 20;
  const offset = size / 2;

  return (
    <div
      ref={cursorRef}
      aria-hidden
      style={{
        position:       "fixed",
        top:            0,
        left:           0,
        zIndex:         9999,
        pointerEvents:  "none",
        willChange:     "transform",
        /* Center on cursor tip */
        marginLeft:     -offset,
        marginTop:      -offset,
        width:          size,
        height:         size,
        borderRadius:   "50%",
        /* Fill that inverts page colors — signature Awwwards look */
        background:     isHover
          ? "rgba(201,168,76,0.15)"
          : "rgba(201,168,76,0.9)",
        border:         isHover
          ? "1px solid rgba(201,168,76,0.8)"
          : "none",
        mixBlendMode:   isHover ? "normal" : "difference",
        backdropFilter: isHover ? "blur(4px)" : "none",
        /* Spring-like scale transition */
        transition: [
          "width 0.55s cubic-bezier(0.34,1.56,0.64,1)",
          "height 0.55s cubic-bezier(0.34,1.56,0.64,1)",
          "margin 0.55s cubic-bezier(0.34,1.56,0.64,1)",
          "background 0.35s ease",
          "border 0.35s ease",
          "opacity 0.2s ease",
        ].join(", "),
        opacity:        isClick ? 0.6 : 1,
        display:        "flex",
        alignItems:     "center",
        justifyContent: "center",
        overflow:       "hidden",
      }}
    >
    </div>
  );
}
