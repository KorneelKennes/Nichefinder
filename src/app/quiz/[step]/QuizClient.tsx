"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import { Display, ProgressDots, CheckRow } from "@/components/primitives";
import { NF_QUIZ, type Question } from "@/data/quiz";
import { useQuizAnswers } from "@/lib/quiz-state";
import type { SellerProfile } from "@/lib/types";

type AnswerValue = SellerProfile[keyof SellerProfile];

function QuizOption({
  opt,
  selected,
  onClick,
  layout,
}: {
  opt: { v: string; label: string; hint?: string; icon?: string };
  selected: boolean;
  onClick: () => void;
  layout: string;
}) {
  if (layout === "tile-grid-2" || layout === "tile-list") {
    return (
      <button className={`tile ${selected ? "selected" : ""}`} onClick={onClick}>
        <div className="flex" style={{ alignItems: "flex-start", gap: 14 }}>
          {opt.icon && (
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: 10,
                background: "var(--bg-2)",
                display: "grid",
                placeItems: "center",
                color: "var(--brass)",
                fontSize: 17,
                flexShrink: 0,
              }}
            >
              <i className={opt.icon} />
            </div>
          )}
          <div style={{ flex: 1, paddingRight: 28 }}>
            <div style={{ fontSize: 16, fontWeight: 500, lineHeight: 1.35 }}>{opt.label}</div>
            {opt.hint && <div className="muted" style={{ fontSize: 13.5, marginTop: 4 }}>{opt.hint}</div>}
          </div>
        </div>
      </button>
    );
  }
  if (layout === "checks-grid") {
    return (
      <button
        className={`tile ${selected ? "selected" : ""}`}
        onClick={onClick}
        style={{ padding: "16px 18px" }}
      >
        <div className="flex" style={{ alignItems: "center", gap: 12 }}>
          {opt.icon && <i className={opt.icon} style={{ color: "var(--brass)", fontSize: 16, width: 22 }} />}
          <span style={{ fontSize: 14.5 }}>{opt.label}</span>
        </div>
      </button>
    );
  }
  return null;
}

function QuestionBlock({
  q,
  answers,
  setAnswer,
}: {
  q: Question;
  answers: SellerProfile;
  setAnswer: (key: keyof SellerProfile, value: AnswerValue) => void;
}) {
  const val = (answers as Record<string, unknown>)[q.key];

  if (q.type === "single") {
    const cls = q.layout === "tile-grid-2" ? "q-grid-2" : "q-list";
    return (
      <div className={cls}>
        {q.options.map((opt) => (
          <QuizOption
            key={opt.v}
            opt={opt}
            layout={q.layout}
            selected={val === opt.v}
            onClick={() => setAnswer(q.key as keyof SellerProfile, opt.v as AnswerValue)}
          />
        ))}
      </div>
    );
  }

  if (q.type === "multi" && q.layout === "checks-grouped" && q.groups) {
    const arr = (val as string[] | undefined) ?? [];
    const toggle = (v: string) => {
      const next = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
      setAnswer(q.key as keyof SellerProfile, next as AnswerValue);
    };
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 28 }}>
        {q.groups.map((g) => (
          <div key={g.name}>
            <div className="label" style={{ marginBottom: 12 }}>{g.name}</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 8 }}>
              {g.options.map((o) => (
                <CheckRow
                  key={o.v}
                  checked={arr.includes(o.v)}
                  label={o.label}
                  onClick={() => toggle(o.v)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (q.type === "multi" && q.layout === "checks-grid" && q.options) {
    const arr = (val as string[] | undefined) ?? [];
    const toggle = (v: string) => {
      const next = arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];
      setAnswer(q.key as keyof SellerProfile, next as AnswerValue);
    };
    return (
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 12 }}>
        {q.options.map((o) => (
          <QuizOption
            key={o.v}
            opt={o}
            layout="checks-grid"
            selected={arr.includes(o.v)}
            onClick={() => toggle(o.v)}
          />
        ))}
      </div>
    );
  }

  if (q.type === "multi-max" && q.layout === "image-grid") {
    const arr = (val as string[] | undefined) ?? [];
    const toggle = (v: string) => {
      let next: string[];
      if (arr.includes(v)) next = arr.filter((x) => x !== v);
      else if (arr.length >= q.max) next = [...arr.slice(1), v];
      else next = [...arr, v];
      setAnswer(q.key as keyof SellerProfile, next as AnswerValue);
    };
    return (
      <div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(170px, 1fr))", gap: 14 }}>
          {q.options.map((o) => (
            <button
              key={o.v}
              className={`tile tile-image ${arr.includes(o.v) ? "selected" : ""}`}
              onClick={() => toggle(o.v)}
            >
              <div
                className="img"
                style={{
                  position: "relative",
                  background: `linear-gradient(140deg, hsl(${o.hue} 55% 70%), hsl(${(o.hue + 45) % 360} 55% 45%))`,
                  overflow: "hidden",
                }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={o.img}
                  alt=""
                  loading="eager"
                  decoding="async"
                  style={{
                    position: "absolute",
                    inset: 0,
                    width: "100%",
                    height: "100%",
                    objectFit: "cover",
                    opacity: 0.78,
                  }}
                />
                <div
                  style={{
                    position: "absolute",
                    inset: 0,
                    background: `linear-gradient(160deg, hsl(${o.hue} 55% 60% / 0.25), hsl(${(o.hue + 45) % 360} 55% 35% / 0.55))`,
                  }}
                />
                <i
                  className={o.icon}
                  style={{
                    position: "relative",
                    fontSize: 32,
                    color: "#FFF8EA",
                    filter: "drop-shadow(0 2px 10px rgba(0,0,0,0.55))",
                    margin: "auto",
                    display: "grid",
                    placeItems: "center",
                    height: "100%",
                  }}
                />
              </div>
              <div className="meta">
                <div className="name">{o.label}</div>
                <div className="desc">{o.desc}</div>
              </div>
            </button>
          ))}
        </div>
        <div className="muted" style={{ fontSize: 13, marginTop: 14 }}>
          {arr.length}/{q.max} selected
        </div>
      </div>
    );
  }

  return null;
}

export function QuizClient({ step }: { step: number }) {
  const router = useRouter();
  const { answers, setAnswer } = useQuizAnswers();

  const stepDef = NF_QUIZ.steps.find((s) => s.id === step) || NF_QUIZ.steps[0];

  const questions = useMemo(() => {
    return stepDef.questions
      .map((k) => NF_QUIZ.questions[k])
      .filter((q) => !q.conditional || q.conditional(answers));
  }, [stepDef, answers]);

  const valid = questions.every((q) => {
    if (q.required === false) return true;
    if (q.conditional && !q.conditional(answers)) return true;
    const v = (answers as Record<string, unknown>)[q.key];
    if (q.type === "single") return !!v;
    if (q.type === "multi") return Array.isArray(v) && v.length > 0;
    if (q.type === "multi-max") return Array.isArray(v) && v.length > 0;
    return true;
  });

  const next = () => {
    if (step >= 5) router.push("/analyzing");
    else router.push(`/quiz/${step + 1}`);
  };
  const prev = () => {
    if (step <= 1) router.push("/");
    else router.push(`/quiz/${step - 1}`);
  };

  return (
    <div className="quiz-shell">
      <div className="quiz-top container">
        <Link className="nf-wordmark" href="/">
          <span style={{ fontFamily: "var(--font-display)", fontStyle: "italic", fontSize: 20 }}>
            nichefinder
          </span>
        </Link>
        <ProgressDots count={5} current={step} />
        <div className="muted tabular" style={{ fontSize: 13 }}>
          {step}/5
        </div>
      </div>

      <div className="container-narrow quiz-body">
        {questions.map((q, qi) => (
          <div key={q.key} className="fade-up" style={{ marginBottom: 48, animationDelay: `${qi * 80}ms` }}>
            <Display parts={q.headline} as="h2" style={{ fontSize: "clamp(32px, 4.4vw, 48px)" }} />
            {q.sub && (
              <p className="muted" style={{ fontSize: 17, marginTop: 14, marginBottom: 32 }}>
                {q.sub}
              </p>
            )}
            <QuestionBlock q={q} answers={answers} setAnswer={setAnswer} />
          </div>
        ))}

        <div className="quiz-actions">
          <button className="btn btn-ghost" onClick={prev}>
            ← Back
          </button>
          <button className="btn btn-primary btn-lg" onClick={next} disabled={!valid}>
            {step === 5 ? "Reveal my niches" : "Continue"} →
          </button>
        </div>

        <div className="muted" style={{ fontSize: 12.5, textAlign: "center", marginTop: 28 }}>
          We don&apos;t store your answers until you confirm at the end.
        </div>
      </div>
    </div>
  );
}
