"use client";

import { useEffect, useRef } from "react";

import { cn } from "@/lib/utils";

interface Ember {
  x: number;
  y: number;
  radius: number;
  speedY: number;
  driftX: number;
  alpha: number;
  pulse: number;
  gold: boolean;
}

/**
 * Braci dorate e cremisi che fluttuano verso l'alto (canvas leggero).
 * Rispetta prefers-reduced-motion e si adatta al contenitore.
 */
export function EmberParticles({
  className,
  density = 30,
}: {
  className?: string;
  density?: number;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const context = canvas.getContext("2d");
    if (!context) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    /* Su viewport piccoli le braci si dimezzano (budget performance §5.6). */
    const effectiveDensity =
      window.innerWidth < 640 ? Math.min(density, 20) : density;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    let width = 0;
    let height = 0;
    let embers: Ember[] = [];
    let frame = 0;

    const spawn = (initial: boolean): Ember => ({
      x: Math.random() * width,
      y: initial ? Math.random() * height : height + 10,
      radius: 0.6 + Math.random() * 1.8,
      speedY: 0.15 + Math.random() * 0.45,
      driftX: (Math.random() - 0.5) * 0.3,
      alpha: 0.1 + Math.random() * 0.5,
      pulse: Math.random() * Math.PI * 2,
      gold: Math.random() > 0.18,
    });

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      width = rect.width;
      height = rect.height;
      canvas.width = Math.max(1, Math.round(width * dpr));
      canvas.height = Math.max(1, Math.round(height * dpr));
      context.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (embers.length === 0) {
        embers = Array.from({ length: effectiveDensity }, () => spawn(true));
      }
    };

    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(canvas);

    const tick = () => {
      if (!document.hidden) {
        context.clearRect(0, 0, width, height);
        for (let i = 0; i < embers.length; i++) {
          const ember = embers[i];
          ember.pulse += 0.012;
          ember.y -= ember.speedY;
          ember.x += ember.driftX + Math.sin(ember.pulse) * 0.08;

          if (ember.y < -12 || ember.x < -12 || ember.x > width + 12) {
            embers[i] = spawn(false);
            continue;
          }

          const flicker = ember.alpha * (0.7 + 0.3 * Math.sin(ember.pulse * 3));
          const color = ember.gold ? "212,175,55" : "179,64,46";
          const gradient = context.createRadialGradient(
            ember.x,
            ember.y,
            0,
            ember.x,
            ember.y,
            ember.radius * 3
          );
          gradient.addColorStop(0, `rgba(${color},${flicker.toFixed(3)})`);
          gradient.addColorStop(1, `rgba(${color},0)`);
          context.fillStyle = gradient;
          context.beginPath();
          context.arc(ember.x, ember.y, ember.radius * 3, 0, Math.PI * 2);
          context.fill();
        }
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
    };
  }, [density]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden
      className={cn("pointer-events-none absolute inset-0 size-full", className)}
    />
  );
}
