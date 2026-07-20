"use server";

import { prisma, Board, AnswerOption } from "@auditor-ai/db";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getDemoUser } from "@/lib/analytics";

const BOARDS = Object.values(Board) as string[];
const ANSWER_KEYS = Object.values(AnswerOption) as string[];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");
}

export async function createExam(formData: FormData) {
  const name = String(formData.get("name") ?? "").trim();
  const institution = String(formData.get("institution") ?? "").trim();
  const board = String(formData.get("board") ?? "");
  const year = Number(formData.get("year"));
  if (!name || !institution || !BOARDS.includes(board) || !Number.isInteger(year)) {
    redirect("/dashboard/exams?error=campos");
  }

  // Sufixo numérico evita colisão de slug entre editais homônimos
  const base = slugify(`${institution}-${year}-${name}`).slice(0, 60);
  let slug = base;
  for (let i = 2; await prisma.exam.findUnique({ where: { slug } }); i++) {
    slug = `${base}-${i}`;
  }

  const exam = await prisma.exam.create({
    data: { name, slug, institution, board: board as Board, year },
  });

  // Matricula o usuário automaticamente — edital criado à mão é para estudo
  const user = await getDemoUser();
  if (user) {
    await prisma.enrollment.upsert({
      where: { userId_examId: { userId: user.id, examId: exam.id } },
      update: {},
      create: { userId: user.id, examId: exam.id },
    });
  }

  revalidatePath("/dashboard/exams");
  redirect(`/dashboard/exams/${exam.id}`);
}

export async function toggleEnrollment(formData: FormData) {
  const examId = String(formData.get("examId") ?? "");
  const user = await getDemoUser();
  if (!user || !examId) redirect("/dashboard/exams");

  const existing = await prisma.enrollment.findUnique({
    where: { userId_examId: { userId: user.id, examId } },
  });
  if (existing) {
    await prisma.enrollment.delete({ where: { id: existing.id } });
  } else {
    await prisma.enrollment.create({ data: { userId: user.id, examId } });
  }
  revalidatePath("/dashboard/exams");
}

export async function createSubject(formData: FormData) {
  const examId = String(formData.get("examId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const rawWeight = String(formData.get("examWeight") ?? "").trim();
  if (!examId || !name) redirect(`/dashboard/exams/${examId}?error=campos`);

  const last = await prisma.subject.findFirst({
    where: { examId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  try {
    await prisma.subject.create({
      data: {
        examId,
        name,
        examWeight: rawWeight ? Number(rawWeight.replace(",", ".")) : null,
        position: (last?.position ?? -1) + 1,
      },
    });
  } catch {
    redirect(`/dashboard/exams/${examId}?error=duplicada`);
  }
  revalidatePath(`/dashboard/exams/${examId}`);
}

export async function createTopic(formData: FormData) {
  const subjectId = String(formData.get("subjectId") ?? "");
  const examId = String(formData.get("examId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!subjectId || !name) redirect(`/dashboard/exams/${examId}?error=campos`);

  const last = await prisma.topic.findFirst({
    where: { subjectId, parentId: null },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  try {
    await prisma.topic.create({
      data: { subjectId, name, position: (last?.position ?? -1) + 1 },
    });
  } catch {
    redirect(`/dashboard/exams/${examId}?error=duplicado`);
  }
  revalidatePath(`/dashboard/exams/${examId}`);
}

export async function createQuestion(formData: FormData) {
  const topicId = String(formData.get("topicId") ?? "");
  const statement = String(formData.get("statement") ?? "").trim();
  const explanation = String(formData.get("explanation") ?? "").trim();
  const correctAnswer = String(formData.get("correctAnswer") ?? "");
  const board = String(formData.get("board") ?? "");
  const rawYear = String(formData.get("year") ?? "").trim();
  const sourceExam = String(formData.get("sourceExam") ?? "").trim();

  const options = ANSWER_KEYS.flatMap((key) => {
    const text = String(formData.get(`option${key}`) ?? "").trim();
    return text ? [{ key, text }] : [];
  });

  const valid =
    topicId &&
    statement &&
    explanation &&
    BOARDS.includes(board) &&
    options.length >= 2 &&
    options.some((o) => o.key === correctAnswer);
  if (!valid) redirect("/dashboard/questions/new?error=campos");

  await prisma.question.create({
    data: {
      topicId,
      statement,
      options,
      correctAnswer: correctAnswer as AnswerOption,
      explanation,
      board: board as Board,
      year: rawYear ? Number(rawYear) : null,
      sourceExam: sourceExam || null,
    },
  });

  revalidatePath("/dashboard/questions");
  redirect("/dashboard/questions?created=1");
}
