import { prisma } from "@auditor-ai/db";

const DAY_MS = 86_400_000;

export interface Kpis {
  answered7d: number;
  correct7d: number;
  /** % 0-100; null sem respostas no período */
  accuracy7d: number | null;
  dueToday: number;
  streakDays: number;
}

export interface TopicPerformance {
  topicId: string;
  assunto: string;
  respostas: number;
  /** % 0-100; null sem respostas */
  acerto: number | null;
}

export interface SubjectPerformance {
  subjectId: string;
  disciplina: string;
  examName: string;
  /** peso da disciplina no edital; null = edital não informa */
  relevancia: number | null;
  /** % de incidência da banca, se cadastrada */
  incidencia: number | null;
  respostas: number;
  /** % 0-100; null sem respostas */
  acerto: number | null;
  /** Tópicos-raiz da disciplina — drill-down, não a visão principal. */
  topics: TopicPerformance[];
}

/** Single-user por enquanto — vira sessão autenticada quando houver login. */
export async function getDemoUser() {
  return prisma.user.findFirst({
    where: { active: true },
    orderBy: { createdAt: "asc" },
  });
}

export async function getKpis(userId: string, timezone: string): Promise<Kpis> {
  const now = Date.now();
  const [logs7d, dueToday, recent] = await Promise.all([
    prisma.answerLog.findMany({
      where: { userId, answeredAt: { gte: new Date(now - 7 * DAY_MS) } },
      select: { isCorrect: true },
    }),
    prisma.spacedRepetitionCard.count({
      where: { userId, dueAt: { lte: new Date() } },
    }),
    prisma.answerLog.findMany({
      where: { userId, answeredAt: { gte: new Date(now - 60 * DAY_MS) } },
      select: { answeredAt: true },
    }),
  ]);

  const answered7d = logs7d.length;
  const correct7d = logs7d.filter((l) => l.isCorrect).length;
  const accuracy7d = answered7d
    ? Math.round((100 * correct7d) / answered7d)
    : null;

  // Sequência: dias consecutivos com >=1 resposta, na timezone do usuário.
  // Hoje ainda sem resposta não quebra a sequência.
  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: timezone });
  const days = new Set(recent.map((l) => fmt.format(l.answeredAt)));
  let streakDays = 0;
  for (let i = 0; i <= 60; i++) {
    if (days.has(fmt.format(new Date(now - i * DAY_MS)))) streakDays++;
    else if (i > 0) break;
  }

  return { answered7d, correct7d, accuracy7d, dueToday, streakDays };
}

/**
 * Agrega o desempenho por DISCIPLINA — visão principal do dashboard.
 * Escopo: só editais em que o usuário está matriculado (Enrollment),
 * senão dados de qualquer edital cadastrado no banco vazam para todo
 * usuário. Tópicos ficam como detalhe (drill-down) dentro de cada
 * disciplina, não como linhas soltas na tabela principal.
 */
export async function getSubjectPerformance(
  userId: string,
): Promise<SubjectPerformance[]> {
  const enrollments = await prisma.enrollment.findMany({
    where: { userId },
    select: { examId: true },
  });
  const examIds = enrollments.map((e) => e.examId);
  if (examIds.length === 0) return [];

  const subjects = await prisma.subject.findMany({
    where: { examId: { in: examIds } },
    include: {
      exam: { select: { name: true } },
      topics: {
        where: { parentId: null }, // só raiz para a hierarquia
        include: {
          questions: {
            where: { active: true },
            include: {
              answers: {
                where: { userId },
                select: { isCorrect: true },
              },
            },
          },
          children: {
            include: {
              questions: {
                where: { active: true },
                include: {
                  answers: {
                    where: { userId },
                    select: { isCorrect: true },
                  },
                },
              },
            },
          },
        },
      },
    },
    orderBy: [{ examWeight: "desc" }, { name: "asc" }],
  });

  return subjects.map((sub) => {
    let subAnswers = 0;
    let subCorrect = 0;

    const topics: TopicPerformance[] = sub.topics.map((top) => {
      let topAnswers = 0;
      let topCorrect = 0;

      // Respostas diretas no tópico-raiz
      for (const q of top.questions) {
        for (const a of q.answers) {
          topAnswers++;
          if (a.isCorrect) topCorrect++;
        }
      }

      // Respostas nos subtópicos (filhos)
      for (const child of top.children) {
        for (const q of child.questions) {
          for (const a of q.answers) {
            topAnswers++;
            if (a.isCorrect) topCorrect++;
          }
        }
      }

      subAnswers += topAnswers;
      subCorrect += topCorrect;

      return {
        topicId: top.id,
        assunto: top.name,
        respostas: topAnswers,
        acerto: topAnswers > 0 ? Math.round((100 * topCorrect) / topAnswers) : null,
      };
    });

    return {
      subjectId: sub.id,
      disciplina: sub.name,
      examName: sub.exam.name,
      relevancia: sub.examWeight ? Number(sub.examWeight) : null,
      incidencia: null,
      respostas: subAnswers,
      acerto: subAnswers > 0 ? Math.round((100 * subCorrect) / subAnswers) : null,
      topics,
    };
  });
}

export interface DailyAnalytics {
  date: string;
  whatsappCorrect: number;
  whatsappIncorrect: number;
  webCorrect: number;
  webIncorrect: number;
  accuracy: number | null;
}

export async function getDailyAnalytics(
  userId: string,
  timezone: string,
): Promise<DailyAnalytics[]> {
  const now = Date.now();
  const logs = await prisma.answerLog.findMany({
    where: { userId, answeredAt: { gte: new Date(now - 7 * DAY_MS) } },
    select: { channel: true, isCorrect: true, answeredAt: true },
  });

  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: timezone });
  const map = new Map<string, DailyAnalytics>();

  // Inicializa os últimos 7 dias na ordem cronológica
  for (let i = 6; i >= 0; i--) {
    const d = fmt.format(new Date(now - i * DAY_MS));
    map.set(d, {
      date: d,
      whatsappCorrect: 0,
      whatsappIncorrect: 0,
      webCorrect: 0,
      webIncorrect: 0,
      accuracy: null,
    });
  }

  for (const l of logs) {
    const d = fmt.format(l.answeredAt);
    const entry = map.get(d);
    if (!entry) continue;

    if (l.channel === "WHATSAPP") {
      if (l.isCorrect) entry.whatsappCorrect++;
      else entry.whatsappIncorrect++;
    } else {
      if (l.isCorrect) entry.webCorrect++;
      else entry.webIncorrect++;
    }
  }

  return Array.from(map.values()).map((entry) => {
    const total =
      entry.whatsappCorrect +
      entry.whatsappIncorrect +
      entry.webCorrect +
      entry.webIncorrect;
    const correct = entry.whatsappCorrect + entry.webCorrect;
    return {
      ...entry,
      accuracy: total > 0 ? Math.round((100 * correct) / total) : null,
    };
  });
}

export interface ActivityDay {
  date: string;
  count: number;
}

export async function getActivityHeatmap(
  userId: string,
  timezone: string,
): Promise<ActivityDay[]> {
  const now = Date.now();
  const WEEKS = 16;
  const startMs = now - (WEEKS * 7 - 1) * DAY_MS;

  const logs = await prisma.answerLog.findMany({
    where: { userId, answeredAt: { gte: new Date(startMs) } },
    select: { answeredAt: true },
  });

  const fmt = new Intl.DateTimeFormat("en-CA", { timeZone: timezone });
  const counts = new Map<string, number>();

  for (const l of logs) {
    const d = fmt.format(l.answeredAt);
    counts.set(d, (counts.get(d) ?? 0) + 1);
  }

  const days: ActivityDay[] = [];
  for (let i = WEEKS * 7 - 1; i >= 0; i--) {
    const d = fmt.format(new Date(now - i * DAY_MS));
    days.push({ date: d, count: counts.get(d) ?? 0 });
  }

  return days;
}

export function isAlert(perf: SubjectPerformance): boolean {
  return (
    perf.relevancia !== null &&
    perf.relevancia >= 8 &&
    perf.acerto !== null &&
    perf.acerto < 70
  );
}
