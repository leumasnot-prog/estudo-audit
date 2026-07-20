/**
 * SM-2 (SuperMemo-2) puro — sem I/O, 100% testável.
 * Referência: hermes-architecture.md §4.3
 */

export type Quality = 0 | 1 | 2 | 3 | 4 | 5;

export interface Sm2State {
  easeFactor: number;
  intervalDays: number;
  repetitions: number;
  lapses: number;
}

export interface Sm2Options {
  /** Cap de intervalo (ex: dias até a prova / 2). */
  maxIntervalDays?: number | undefined;
}

const MIN_EASE = 1.3;

/**
 * Deriva a nota 0-5 do resultado, já que não há autoavaliação como no Anki.
 * Correta <60s = 5 | <5min = 4 | além = 3 | errada = 1.
 */
export function qualityFromAnswer(
  isCorrect: boolean,
  responseTimeMs: number | null,
): Quality {
  if (!isCorrect) return 1;
  if (responseTimeMs === null) return 4;
  if (responseTimeMs < 60_000) return 5;
  if (responseTimeMs < 300_000) return 4;
  return 3;
}

export function sm2(
  state: Sm2State,
  quality: Quality,
  opts: Sm2Options = {},
): Sm2State {
  const passed = quality >= 3;

  const easeFactor = Math.max(
    MIN_EASE,
    state.easeFactor + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02)),
  );

  if (!passed) {
    return {
      easeFactor,
      intervalDays: 1,
      repetitions: 0,
      lapses: state.lapses + 1,
    };
  }

  const repetitions = state.repetitions + 1;
  let intervalDays: number;
  if (repetitions === 1) intervalDays = 1;
  else if (repetitions === 2) intervalDays = 6;
  else intervalDays = Math.round(state.intervalDays * easeFactor);

  if (opts.maxIntervalDays !== undefined) {
    intervalDays = Math.min(intervalDays, Math.max(1, opts.maxIntervalDays));
  }

  return { easeFactor, intervalDays, repetitions, lapses: state.lapses };
}

/** Próxima revisão a partir de agora. */
export function nextDueAt(intervalDays: number, from = new Date()): Date {
  return new Date(from.getTime() + intervalDays * 24 * 3600 * 1000);
}
