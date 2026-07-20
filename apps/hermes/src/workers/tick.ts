import { DateTime } from "luxon";
import { prisma } from "../lib/db.js";
import { sessionQueue } from "../queues.js";

/**
 * Roda a cada hora (UTC). Fan-out: 1 job hermes.session por usuário cuja
 * hora local == sendHour. jobId diário torna o fan-out idempotente.
 */
export async function processTick(): Promise<void> {
  const users = await prisma.user.findMany({
    where: { active: true, enrollments: { some: {} } },
    select: { id: true, timezone: true, sendHour: true },
  });

  const nowUtc = DateTime.utc();

  for (const user of users) {
    const local = nowUtc.setZone(user.timezone);
    if (!local.isValid || local.hour !== user.sendHour) continue;

    const localDate = local.toISODate();
    await sessionQueue.add(
      "session",
      { userId: user.id, localDate },
      { jobId: `session-${user.id}-${localDate}` },
    );
  }
}
