'use client';

import { useRef, useEffect, useCallback } from 'react';

interface Particle {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  char: string;
  vx: number;
  vy: number;
  opacity: number;
  targetOpacity: number;
  size: number;
  color: string;
}

const ASCII_CHARS = '@#%&*+=-:. '.split('');
const ACCENT = '#00d4aa';
const TEXT_DIM = '#3d3d47';
const TEXT_MID = '#6b6b76';

function getCharForBrightness(brightness: number): string {
  const idx = Math.floor((1 - brightness) * (ASCII_CHARS.length - 1));
  return ASCII_CHARS[Math.min(idx, ASCII_CHARS.length - 1)];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function AsciiHero({
  text = 'SUIATTEST',
  subtitle = 'Verifiable credentials, on-chain.',
}: {
  text?: string;
  subtitle?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const animFrameRef = useRef<number>(0);
  const phaseRef = useRef<'assembling' | 'holding' | 'dissolving'>('assembling');
  const timerRef = useRef(0);
  const mouseRef = useRef({ x: -1000, y: -1000 });

  const sampleText = useCallback(
    (canvas: HTMLCanvasElement, displayText: string) => {
      const offscreen = document.createElement('canvas');
      const w = canvas.width;
      const h = canvas.height;
      offscreen.width = w;
      offscreen.height = h;
      const offCtx = offscreen.getContext('2d')!;

      const fontSize = Math.min(w / (displayText.length * 0.55), h * 0.35);
      offCtx.fillStyle = '#fff';
      offCtx.font = `bold ${fontSize}px "Geist", system-ui, sans-serif`;
      offCtx.textAlign = 'center';
      offCtx.textBaseline = 'middle';
      offCtx.fillText(displayText, w / 2, h / 2 - 10);

      const imageData = offCtx.getImageData(0, 0, w, h);
      const positions: { x: number; y: number; brightness: number }[] = [];
      const gap = 8;

      for (let y = 0; y < h; y += gap) {
        for (let x = 0; x < w; x += gap) {
          const i = (y * w + x) * 4;
          const alpha = imageData.data[i + 3];
          if (alpha > 128) {
            const r = imageData.data[i];
            const g = imageData.data[i + 1];
            const b = imageData.data[i + 2];
            const brightness = (r + g + b) / (3 * 255);
            positions.push({ x, y, brightness });
          }
        }
      }

      return positions;
    },
    [],
  );

  const initParticles = useCallback(
    (canvas: HTMLCanvasElement) => {
      const positions = sampleText(canvas, text);
      const particles: Particle[] = positions.map(({ x, y, brightness }) => {
        const angle = Math.random() * Math.PI * 2;
        const dist = 200 + Math.random() * 400;
        const isAccent = Math.random() < 0.08;
        return {
          x: canvas.width / 2 + Math.cos(angle) * dist,
          y: canvas.height / 2 + Math.sin(angle) * dist,
          targetX: x,
          targetY: y,
          char: getCharForBrightness(brightness),
          vx: 0,
          vy: 0,
          opacity: 0,
          targetOpacity: 1,
          size: 7 + Math.random() * 2,
          color: isAccent ? ACCENT : Math.random() > 0.3 ? TEXT_MID : TEXT_DIM,
        };
      });
      particlesRef.current = particles;
      phaseRef.current = 'assembling';
      timerRef.current = 0;
    },
    [text, sampleText],
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;

    const resize = () => {
      const rect = canvas.getBoundingClientRect();
      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      ctx.scale(dpr, dpr);
      initParticles(canvas);
    };

    resize();
    window.addEventListener('resize', resize);

    const onMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: (e.clientX - rect.left) * dpr,
        y: (e.clientY - rect.top) * dpr,
      };
    };
    canvas.addEventListener('mousemove', onMouseMove);

    let lastTime = performance.now();

    const animate = (now: number) => {
      const dt = Math.min((now - lastTime) / 1000, 0.05);
      lastTime = now;
      timerRef.current += dt;

      const w = canvas.width / dpr;
      const h = canvas.height / dpr;
      ctx.clearRect(0, 0, w, h);

      const phase = phaseRef.current;
      const particles = particlesRef.current;
      const mouse = mouseRef.current;

      if (phase === 'assembling' && timerRef.current > 2.5) {
        phaseRef.current = 'holding';
        timerRef.current = 0;
      } else if (phase === 'holding' && timerRef.current > 4) {
        phaseRef.current = 'dissolving';
        timerRef.current = 0;
        for (const p of particles) {
          const angle = Math.random() * Math.PI * 2;
          const dist = 150 + Math.random() * 350;
          p.targetX = w * dpr / 2 + Math.cos(angle) * dist;
          p.targetY = h * dpr / 2 + Math.sin(angle) * dist;
          p.targetOpacity = 0;
        }
      } else if (phase === 'dissolving' && timerRef.current > 2) {
        phaseRef.current = 'assembling';
        timerRef.current = 0;
        const positions = sampleText(canvas, text);
        for (let i = 0; i < particles.length && i < positions.length; i++) {
          particles[i].targetX = positions[i].x;
          particles[i].targetY = positions[i].y;
          particles[i].targetOpacity = 1;
          particles[i].char = getCharForBrightness(positions[i].brightness);
        }
      }

      const speed = phase === 'assembling' ? 0.04 : phase === 'dissolving' ? 0.03 : 0.08;

      for (const p of particles) {
        const dxMouse = p.x - mouse.x;
        const dyMouse = p.y - mouse.y;
        const distMouse = Math.sqrt(dxMouse * dxMouse + dyMouse * dyMouse);
        const repulseRadius = 80 * dpr;

        if (distMouse < repulseRadius && phase !== 'dissolving') {
          const force = (repulseRadius - distMouse) / repulseRadius;
          p.vx += (dxMouse / distMouse) * force * 3;
          p.vy += (dyMouse / distMouse) * force * 3;
        }

        p.vx += (p.targetX - p.x) * speed;
        p.vy += (p.targetY - p.y) * speed;
        p.vx *= 0.85;
        p.vy *= 0.85;
        p.x += p.vx;
        p.y += p.vy;
        p.opacity = lerp(p.opacity, p.targetOpacity, 0.05);

        const drawX = p.x / dpr;
        const drawY = p.y / dpr;

        ctx.globalAlpha = Math.max(0, Math.min(1, p.opacity));
        ctx.fillStyle = p.color;
        ctx.font = `${p.size}px "Geist Mono", monospace`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(p.char, drawX, drawY);
      }

      ctx.globalAlpha = 1;
      animFrameRef.current = requestAnimationFrame(animate);
    };

    animFrameRef.current = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
      window.removeEventListener('resize', resize);
      canvas.removeEventListener('mousemove', onMouseMove);
    };
  }, [initParticles, text, sampleText]);

  return (
    <div className="relative w-full" style={{ height: '340px' }}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
        style={{ touchAction: 'none' }}
      />
      <div className="absolute inset-x-0 bottom-0 text-center pointer-events-none">
        <p className="text-base text-text-secondary max-w-md mx-auto">
          {subtitle}
        </p>
      </div>
    </div>
  );
}
