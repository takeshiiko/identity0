"use client";

import { useEffect, useRef, useState } from "react";

const INTERACTION_EVENTS = ["click", "keydown", "pointerdown", "scroll", "touchstart"] as const;

export default function AudioPlayer() {
  const audioRef  = useRef<HTMLAudioElement>(null);
  const startedRef = useRef(false);          // closure-safe flag — avoids stale state
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const start = () => {
      if (startedRef.current) return;
      audio.play()
        .then(() => { startedRef.current = true; setPlaying(true); removeListeners(); })
        .catch(() => { /* blocked — listeners will retry on interaction */ });
    };

    const onInteraction = () => start();

    const removeListeners = () =>
      INTERACTION_EVENTS.forEach((ev) =>
        window.removeEventListener(ev, onInteraction, { capture: true } as EventListenerOptions)
      );

    /* 1. Try immediately (works when browser allows autoplay) */
    start();

    /* 2. Retry on first user gesture (Chrome/Safari autoplay policy fallback) */
    INTERACTION_EVENTS.forEach((ev) =>
      window.addEventListener(ev, onInteraction, { passive: true, capture: true })
    );

    return removeListeners;
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (playing) {
      audio.pause();
      setPlaying(false);
    } else {
      audio.play().then(() => setPlaying(true)).catch(() => {});
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end gap-2">
      {/* Şarkı bilgisi */}
      <div className="flex flex-col items-end gap-0.5">
        <span className="text-xs font-inter text-gold/80 tracking-wide">Mercan Dede</span>
        <span className="text-xs font-inter text-gold/50 tracking-wider italic">Naif</span>
      </div>

      <button
        onClick={toggle}
        aria-label={playing ? "Pause music" : "Play music"}
        className="relative w-11 h-11 flex items-center justify-center rounded-full
          border border-gold/30 bg-ebru-card/80 backdrop-blur-sm
          hover:border-gold/60 hover:bg-gold/10
          transition-all duration-300"
        style={{ boxShadow: playing ? "0 0 20px rgba(201,168,76,0.25)" : undefined }}
      >
        {playing && (
          <span
            className="absolute inset-0 rounded-full border border-gold/30 animate-ping"
            style={{ animationDuration: "2s" }}
          />
        )}

        {playing ? (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <rect x="2" y="2" width="3.5" height="10" rx="1" fill="#C9A84C" />
            <rect x="8.5" y="2" width="3.5" height="10" rx="1" fill="#C9A84C" />
          </svg>
        ) : (
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M3 2L12 7L3 12V2Z" fill="#C9A84C" />
          </svg>
        )}
      </button>

      <audio ref={audioRef} loop preload="auto" src="/music/ebru-ambient.mp3" />
    </div>
  );
}
