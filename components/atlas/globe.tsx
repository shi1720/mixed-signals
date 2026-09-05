'use client';
/* oxlint-disable jsx-a11y/prefer-tag-over-role -- Canvas visualization has a textual description and an equivalent semantic city list. */
import { useEffect, useRef, useState } from 'react';
import { Pause, Play, RotateCcw, ZoomIn, ZoomOut } from 'lucide-react';
import points from '@/lib/data/land-points.json';
import { CITY_BY_ID, type City } from '@/lib/cities';
import { METRICS, type CityResult, type MetricKey } from '@/lib/forecast';
interface Props {
  results: CityResult[];
  metric: MetricKey;
  selected: string | null;
  onSelect: (id: string) => void;
  demo: boolean;
}
const RAD = Math.PI / 180;
// Rotate a unit sphere around the polar axis, then tilt it toward the viewer.
export function projectPoint(
  lon: number,
  lat: number,
  rotation: number,
  tilt: number,
) {
  const a = (lon + rotation) * RAD,
    b = lat * RAD,
    t = tilt * RAD;
  const x = Math.cos(b) * Math.sin(a),
    y = Math.sin(b),
    z = Math.cos(b) * Math.cos(a);
  return {
    x,
    y: y * Math.cos(t) - z * Math.sin(t),
    z: y * Math.sin(t) + z * Math.cos(t),
  };
}
export function Globe({ results, metric, selected, onSelect, demo }: Props) {
  const ref = useRef<HTMLCanvasElement>(null),
    host = useRef<HTMLDivElement>(null),
    rotation = useRef(-18),
    tilt = useRef(18),
    scale = useRef(1),
    drag = useRef<{
      x: number;
      y: number;
      startX: number;
      startY: number;
    } | null>(null),
    markers = useRef<{ x: number; y: number; city: City; r: number }[]>([]),
    selectRef = useRef(onSelect),
    propsRef = useRef({ results, metric, selected });
  const [paused, setPaused] = useState(false),
    [fallback, setFallback] = useState(false),
    [hover, setHover] = useState<string | null>(null);
  const pausedRef = useRef(false),
    needsPaint = useRef(true);
  useEffect(() => {
    propsRef.current = { results, metric, selected };
    needsPaint.current = true;
    selectRef.current = onSelect;
  }, [results, metric, selected, onSelect]);
  useEffect(() => {
    pausedRef.current = paused;
  }, [paused]);
  useEffect(() => {
    if (selected) {
      const city = CITY_BY_ID.get(selected);
      if (city) {
        rotation.current = -city.lon;
        tilt.current = Math.max(-35, Math.min(40, city.lat));
        setPaused(true);
      }
    }
  }, [selected]);
  useEffect(() => {
    const canvas = ref.current,
      container = host.current;
    if (!canvas || !container) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setFallback(true);
      return;
    }
    let width = 0,
      height = 0,
      frame = 0,
      previous = 0,
      visible = true;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
    pausedRef.current = reduced.matches;
    setPaused(reduced.matches);
    const resize = () => {
      width = container.clientWidth;
      height = container.clientHeight;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = width * dpr;
      canvas.height = height * dpr;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      needsPaint.current = true;
    };
    const observer = new ResizeObserver(resize);
    observer.observe(container);
    resize();
    const visibility = new IntersectionObserver((entries) => {
      visible = entries[0].isIntersecting;
    });
    visibility.observe(container);
    const draw = (time: number) => {
      frame = requestAnimationFrame(draw);
      // Resizing clears the canvas. Paint once even offscreen, then pause it.
      if ((!visible && !needsPaint.current) || document.hidden) {
        previous = time;
        return;
      }
      const elapsed = previous ? Math.min(time - previous, 50) : 0;
      if (!needsPaint.current && elapsed && elapsed < 30) return;
      needsPaint.current = false;
      previous = time;
      if (visible && !pausedRef.current && !drag.current)
        rotation.current += elapsed * 0.0025;
      ctx.clearRect(0, 0, width, height);
      const cx = width * 0.5,
        cy = height * 0.52,
        r = Math.min(width * 0.38, height * 0.39) * scale.current;
      ctx.save();
      const atmosphere = ctx.createRadialGradient(
        cx,
        cy,
        r * 0.85,
        cx,
        cy,
        r * 1.3,
      );
      atmosphere.addColorStop(0, '#adc6621c');
      atmosphere.addColorStop(1, '#a6c45b00');
      ctx.fillStyle = atmosphere;
      ctx.beginPath();
      ctx.arc(cx, cy, r * 1.3, 0, Math.PI * 2);
      ctx.fill();
      const sphere = ctx.createRadialGradient(
        cx - r * 0.36,
        cy - r * 0.4,
        0,
        cx,
        cy,
        r * 1.06,
      );
      sphere.addColorStop(0, '#3e4b30');
      sphere.addColorStop(0.65, '#293522');
      sphere.addColorStop(1, '#131d16');
      ctx.fillStyle = sphere;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#bbd57935';
      ctx.lineWidth = 0.8;
      ctx.stroke();
      // Geographic graticule follows the exact same projection as points and cities.
      ctx.strokeStyle = '#c5d89716';
      ctx.lineWidth = 0.65;
      const line = (coords: [number, number][]) => {
        ctx.beginPath();
        let pen = false;
        for (const [lon, lat] of coords) {
          const p = projectPoint(lon, lat, rotation.current, tilt.current);
          if (p.z <= 0) {
            pen = false;
            continue;
          }
          if (!pen) ctx.moveTo(cx + p.x * r, cy - p.y * r);
          else ctx.lineTo(cx + p.x * r, cy - p.y * r);
          pen = true;
        }
        ctx.stroke();
      };
      for (let lat = -60; lat <= 60; lat += 30)
        line(Array.from({ length: 181 }, (_, i) => [-180 + i * 2, lat]));
      for (let lon = -180; lon < 180; lon += 30)
        line(Array.from({ length: 91 }, (_, i) => [lon, -90 + i * 2]));
      for (const [lon, lat] of points) {
        const p = projectPoint(lon, lat, rotation.current, tilt.current);
        if (p.z < 0) continue;
        ctx.fillStyle = `rgba(193,211,140,${0.3 + p.z * 0.65})`;
        ctx.beginPath();
        ctx.arc(
          cx + p.x * r,
          cy - p.y * r,
          Math.max(0.65, r * 0.0053) * (0.65 + p.z * 0.35),
          0,
          Math.PI * 2,
        );
        ctx.fill();
      }
      const current = propsRef.current;
      const color = METRICS[current.metric].color;
      markers.current = [];
      for (const result of current.results) {
        const city = CITY_BY_ID.get(result.cityId);
        if (!city) continue;
        const p = projectPoint(
          city.lon,
          city.lat,
          rotation.current,
          tilt.current,
        );
        if (p.z < 0.08) continue;
        const value = result[current.metric].value;
        if (value === null) continue;
        const x = cx + p.x * r,
          y = cy - p.y * r,
          pr = 3.5 + value * 0.035;
        const active = current.selected === city.id;
        ctx.fillStyle = color + '25';
        ctx.beginPath();
        ctx.arc(x, y, pr + (active ? 11 : 7), 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = color + '66';
        ctx.lineWidth = 0.8;
        ctx.stroke();
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(x, y, pr, 0, Math.PI * 2);
        ctx.fill();
        if (active) {
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(x, y, pr + 4, 0, Math.PI * 2);
          ctx.stroke();
        }
        markers.current.push({ x, y, city, r: Math.max(pr + 7, 14) });
      }
      // Orbit line is an atlas instrument, not a fabricated geography asset.
      ctx.strokeStyle = '#d6fb5238';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      ctx.ellipse(cx, cy, r * 1.28, r * 0.26, -0.28, 0, Math.PI * 2);
      ctx.stroke();
      ctx.restore();
    };
    frame = requestAnimationFrame(draw);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      visibility.disconnect();
    };
  }, []);
  const coords = (e: React.PointerEvent) => {
    const b = ref.current!.getBoundingClientRect();
    return { x: e.clientX - b.left, y: e.clientY - b.top };
  };
  const hit = (x: number, y: number) =>
    markers.current
      .filter((m) => Math.hypot(m.x - x, m.y - y) < m.r)
      .sort(
        (a, b) => Math.hypot(a.x - x, a.y - y) - Math.hypot(b.x - x, b.y - y),
      )[0];
  return (
    <div ref={host} className="globe-container">
      <canvas
        ref={ref}
        className="globe-canvas"
        aria-label={`${demo ? 'Illustrative' : 'Revealed'} dating-weather globe. Drag to rotate. Use the city list below for keyboard navigation.`}
        role="img"
        onPointerDown={(e) => {
          const p = coords(e);
          drag.current = { ...p, startX: p.x, startY: p.y };
          e.currentTarget.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const p = coords(e);
          if (drag.current) {
            rotation.current += (p.x - drag.current.x) * 0.35;
            tilt.current = Math.max(
              -60,
              Math.min(60, tilt.current + (p.y - drag.current.y) * 0.25),
            );
            drag.current.x = p.x;
            drag.current.y = p.y;
          } else {
            setHover(hit(p.x, p.y)?.city.name ?? null);
          }
        }}
        onPointerUp={(e) => {
          const p = coords(e);
          if (
            drag.current &&
            Math.hypot(p.x - drag.current.startX, p.y - drag.current.startY) < 6
          ) {
            const marker = hit(p.x, p.y);
            if (marker) selectRef.current(marker.city.id);
          }
          drag.current = null;
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
        onPointerLeave={() => setHover(null)}
      />
      {fallback && (
        <p className="globe-fallback">
          Your browser cannot draw the globe. All the same city reports are in
          the city list below.
        </p>
      )}
      {!selected && demo && (
        <div className="map-caption">
          <span>EVERY CITY HAS A TYPE.</span>
          <strong>Let's find yours.</strong>
        </div>
      )}
      {hover && <div className="globe-tooltip">{hover} · Click to explore</div>}
      <div className="globe-controls">
        <button
          onClick={() => setPaused(!paused)}
          aria-label={paused ? 'Rotate globe' : 'Pause globe'}
          title={paused ? 'Rotate globe' : 'Pause globe'}
        >
          {paused ? <Play size={15} /> : <Pause size={15} />}
        </button>
        <button
          aria-label="Zoom in"
          title="Zoom in"
          onClick={() => {
            scale.current = Math.min(1.4, scale.current + 0.1);
          }}
        >
          <ZoomIn size={16} />
        </button>
        <button
          aria-label="Zoom out"
          title="Zoom out"
          onClick={() => {
            scale.current = Math.max(0.7, scale.current - 0.1);
          }}
        >
          <ZoomOut size={16} />
        </button>
        <button
          aria-label="Reset globe"
          title="Reset globe"
          onClick={() => {
            scale.current = 1;
            rotation.current = -18;
            tilt.current = 18;
            setPaused(true);
          }}
        >
          <RotateCcw size={15} />
        </button>
      </div>
      <span className="drag-hint">DRAG TO WANDER · CLICK A SIGNAL</span>
    </div>
  );
}
