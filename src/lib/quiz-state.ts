"use client";

import { useEffect, useState, useCallback } from "react";
import type { GenerateResponse, SellerProfile } from "@/lib/types";
import { DEFAULT_ANSWERS } from "@/data/quiz";
import { generateResponseSchema, sellerProfileSchema } from "@/lib/schemas";

const ANSWERS_KEY = "nf:answers:v1";
const RESULTS_KEY = "nf:results:v1";

function readJSON<T>(key: string): T | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = sessionStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function writeJSON<T>(key: string, value: T): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* quota exceeded, ignore */
  }
}

export function useQuizAnswers(): {
  answers: SellerProfile;
  setAnswer: <K extends keyof SellerProfile>(key: K, value: SellerProfile[K]) => void;
  reset: () => void;
} {
  const [answers, setAnswers] = useState<SellerProfile>(DEFAULT_ANSWERS);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    const stored = readJSON<SellerProfile>(ANSWERS_KEY);
    if (stored) setAnswers(stored);
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (hydrated) writeJSON(ANSWERS_KEY, answers);
  }, [answers, hydrated]);

  const setAnswer = useCallback(<K extends keyof SellerProfile>(key: K, value: SellerProfile[K]) => {
    setAnswers((prev) => ({ ...prev, [key]: value }));
  }, []);

  const reset = useCallback(() => {
    setAnswers(DEFAULT_ANSWERS);
    if (typeof window !== "undefined") sessionStorage.removeItem(ANSWERS_KEY);
  }, []);

  return { answers, setAnswer, reset };
}

export function getStoredAnswers(): SellerProfile | null {
  const raw = readJSON<unknown>(ANSWERS_KEY);
  if (!raw) return null;
  const parsed = sellerProfileSchema.safeParse(raw);
  if (!parsed.success) {
    if (typeof window !== "undefined") sessionStorage.removeItem(ANSWERS_KEY);
    return null;
  }
  return parsed.data;
}

export function saveResults(results: GenerateResponse): void {
  writeJSON(RESULTS_KEY, results);
}

export function getStoredResults(): GenerateResponse | null {
  const raw = readJSON<unknown>(RESULTS_KEY);
  if (!raw) return null;
  const parsed = generateResponseSchema.safeParse(raw);
  if (!parsed.success) {
    // Stale result from a previous schema version, drop it instead of crashing the page.
    if (typeof window !== "undefined") sessionStorage.removeItem(RESULTS_KEY);
    return null;
  }
  return parsed.data as GenerateResponse;
}

export function clearResults(): void {
  if (typeof window !== "undefined") sessionStorage.removeItem(RESULTS_KEY);
}
