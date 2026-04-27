import { notFound } from "next/navigation";
import { QuizClient } from "./QuizClient";

export default async function QuizStepPage({
  params,
}: {
  params: Promise<{ step: string }>;
}) {
  const { step } = await params;
  const stepNum = parseInt(step, 10);
  if (!Number.isFinite(stepNum) || stepNum < 1 || stepNum > 5) notFound();
  return <QuizClient step={stepNum} />;
}

export function generateStaticParams() {
  return [{ step: "1" }, { step: "2" }, { step: "3" }, { step: "4" }, { step: "5" }];
}
