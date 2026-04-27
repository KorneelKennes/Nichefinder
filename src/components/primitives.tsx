"use client";

import { useEffect, useState, type ReactNode, type CSSProperties } from "react";

type Headline = (string | { em: string })[];

export function Display({
  parts,
  className = "",
  as: Tag = "h1",
  style,
}: {
  parts: Headline;
  className?: string;
  as?: "h1" | "h2" | "h3";
  style?: CSSProperties;
}) {
  return (
    <Tag className={`display ${className}`} style={style}>
      {parts.map((p, i) =>
        typeof p === "string" ? <span key={i}>{p}</span> : <em key={i}>{p.em}</em>
      )}
    </Tag>
  );
}

export function ProgressDots({ count, current }: { count: number; current: number }) {
  return (
    <div className="dots" role="progressbar" aria-valuemin={1} aria-valuemax={count} aria-valuenow={current}>
      {Array.from({ length: count }).map((_, i) => {
        const idx = i + 1;
        const cls = idx < current ? "done" : idx === current ? "current" : "";
        return <span key={i} className={`dot ${cls}`} />;
      })}
    </div>
  );
}

export function ScoreBar({
  value,
  max,
  color = "sage",
  animate = true,
  delay = 0,
}: {
  value: number;
  max: number;
  color?: string;
  animate?: boolean;
  delay?: number;
}) {
  const [w, setW] = useState(animate ? 0 : (value / max) * 100);
  useEffect(() => {
    if (!animate) {
      setW((value / max) * 100);
      return;
    }
    const t = setTimeout(() => setW((value / max) * 100), 50 + delay);
    return () => clearTimeout(t);
  }, [value, max, animate, delay]);
  return (
    <div className="score-bar-track">
      <div className={`score-bar-fill ${color}`} style={{ width: `${Math.max(0, Math.min(100, w))}%` }} />
    </div>
  );
}

export function ScoreRing({
  value,
  max = 100,
  size = 80,
  stroke = 6,
  color = "var(--sage)",
}: {
  value: number;
  max?: number;
  size?: number;
  stroke?: number;
  color?: string;
}) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const pct = Math.max(0, Math.min(1, value / max));
  const [offset, setOffset] = useState(c);
  useEffect(() => {
    const t = setTimeout(() => setOffset(c * (1 - pct)), 80);
    return () => clearTimeout(t);
  }, [pct, c]);
  return (
    <div className="score-ring" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--hairline)" strokeWidth={stroke} />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          stroke={color}
          strokeWidth={stroke}
          strokeDasharray={c}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 900ms var(--ease)" }}
        />
      </svg>
      <div className="num">{value}</div>
    </div>
  );
}

export function ScoreDotsViz({ value, max, color = "" }: { value: number; max: number; color?: string }) {
  const segments = 10;
  const filled = Math.round((value / max) * segments);
  return (
    <div className="score-dots">
      {Array.from({ length: segments }).map((_, i) => (
        <span key={i} className={`sd ${i < filled ? `on ${color}` : ""}`} />
      ))}
    </div>
  );
}

export function CycleText({ lines, interval = 1700, className = "" }: { lines: string[]; interval?: number; className?: string }) {
  const [i, setI] = useState(0);
  const [show, setShow] = useState(true);
  useEffect(() => {
    const id = setInterval(() => {
      setShow(false);
      setTimeout(() => {
        setI((prev) => (prev + 1) % lines.length);
        setShow(true);
      }, 280);
    }, interval);
    return () => clearInterval(id);
  }, [lines.length, interval]);
  return (
    <div className={`cycle-text ${className}`} style={{ minHeight: "1.6em" }}>
      <span
        style={{
          display: "inline-block",
          opacity: show ? 1 : 0,
          transform: show ? "translateY(0)" : "translateY(6px)",
          transition: "opacity 280ms var(--ease), transform 280ms var(--ease)",
        }}
      >
        {lines[i]}
      </span>
    </div>
  );
}

export function Pill({
  children,
  variant = "default",
  icon,
}: {
  children: ReactNode;
  variant?: "default" | "sage" | "clay" | "brass";
  icon?: string;
}) {
  return (
    <span className={`pill pill-${variant}`}>
      {icon && <i className={icon} style={{ fontSize: 11 }} />}
      {children}
    </span>
  );
}

export function Expand({
  label,
  children,
  defaultOpen = false,
}: {
  label: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="expand">
      <button
        className="btn btn-ghost"
        onClick={() => setOpen(!open)}
        style={{ padding: "8px 0", color: "var(--ink-muted)", fontSize: 14 }}
      >
        <span
          style={{
            display: "inline-block",
            transition: "transform var(--dur) var(--ease)",
            transform: open ? "rotate(90deg)" : "none",
          }}
        >
          ›
        </span>
        <span style={{ marginLeft: 8 }}>{label}</span>
      </button>
      <div
        style={{
          overflow: "hidden",
          maxHeight: open ? "2000px" : 0,
          opacity: open ? 1 : 0,
          transition: "max-height 480ms var(--ease), opacity 320ms var(--ease)",
        }}
      >
        <div style={{ paddingTop: 16 }}>{children}</div>
      </div>
    </div>
  );
}

export function CheckRow({ checked, label, onClick }: { checked: boolean; label: string; onClick: () => void }) {
  return (
    <div className={`check-row ${checked ? "checked" : ""}`} onClick={onClick}>
      <span className="check-box">
        <svg width="12" height="12" viewBox="0 0 16 16" fill="none">
          <path d="M3 8.5l3 3 7-7" stroke="#FFF8EA" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
      <span style={{ fontSize: 15 }}>{label}</span>
    </div>
  );
}
