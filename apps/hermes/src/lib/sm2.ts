/**
 * SM-2 (SuperMemo-2) — implementação movida para @auditor-ai/db para ser
 * compartilhada com o apps/web (respostas via dashboard também alimentam a
 * repetição espaçada). Este arquivo só re-exporta para manter os imports
 * existentes dos workers.
 */
export {
  sm2,
  qualityFromAnswer,
  nextDueAt,
  type Quality,
  type Sm2State,
  type Sm2Options,
} from "@auditor-ai/db/sm2";
