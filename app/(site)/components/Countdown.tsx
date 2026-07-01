"use client";

import { useSyncExternalStore } from "react";

function diffParts(targetMs: number, now: number) {
  const diff = Math.max(0, targetMs - now);
  const d = Math.floor(diff / 86400000);
  const h = Math.floor((diff % 86400000) / 3600000);
  const m = Math.floor((diff % 3600000) / 60000);
  const s = Math.floor((diff % 60000) / 1000);
  return { d, h, m, s };
}

function subscribe(callback: () => void) {
  const id = setInterval(callback, 1000);
  return () => clearInterval(id);
}

export default function Countdown({ target }: { target: string }) {
  const targetMs = new Date(target).getTime();
  // getServerSnapshot mirrors targetMs so the hydration render matches the
  // server (diff = 0); once mounted, subscribe re-renders every second with
  // the real clock.
  const now = useSyncExternalStore(
    subscribe,
    () => Date.now(),
    () => targetMs,
  );
  const parts = diffParts(targetMs, now);
  const pad = (n: number) => String(n).padStart(2, "0");

  return (
    <div className="flip-row">
      <div className="flip">
        <b>{pad(parts.d)}</b>
        <span>dias</span>
      </div>
      <div className="flip">
        <b>{pad(parts.h)}</b>
        <span>horas</span>
      </div>
      <div className="flip">
        <b>{pad(parts.m)}</b>
        <span>min</span>
      </div>
      <div className="flip">
        <b>{pad(parts.s)}</b>
        <span>seg</span>
      </div>
    </div>
  );
}
