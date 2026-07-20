import {
  PrismaClient,
  type AnswerOption,
  type Prisma,
} from "@prisma/client";

const prisma = new PrismaClient();

const opt = (key: AnswerOption, text: string) => ({ key, text });

async function main() {
  await seedCatalog();
  await seedDemoHistory();
}

async function getOrCreateTopic(
  subjectId: string,
  name: string,
  parentId: string | null = null,
  weight: number = 1,
  position: number = 1
) {
  const existing = await prisma.topic.findFirst({
    where: { subjectId, name, parentId },
  });
  if (existing) return existing;

  return await prisma.topic.create({
    data: {
      subjectId,
      name,
      parentId,
      weight,
      position,
    },
  });
}

async function seedCatalog() {
  console.log("Semeando / Atualizando catálogo de questões...");

  // Exam principal: Receita Federal — Auditor-Fiscal 2023
  const exam = await prisma.exam.upsert({
    where: { slug: "rfb-2023" },
    update: {},
    create: {
      name: "Receita Federal — Auditor-Fiscal 2023",
      slug: "rfb-2023",
      institution: "RFB",
      board: "FGV",
      year: 2023,
    },
  });

  // ---- 1. Contabilidade Geral e Avançada ----
  const contabilidade = await prisma.subject.upsert({
    where: { examId_name: { examId: exam.id, name: "Contabilidade Geral e Avançada" } },
    update: {},
    create: {
      examId: exam.id,
      name: "Contabilidade Geral e Avançada",
      examWeight: 30,
      position: 1,
    },
  });

  const dfc = await getOrCreateTopic(contabilidade.id, "Demonstração dos Fluxos de Caixa (DFC)", null, 3, 1);
  const metodoIndireto = await getOrCreateTopic(contabilidade.id, "Método Indireto", dfc.id, 2, 2);
  const cpc00 = await getOrCreateTopic(contabilidade.id, "CPC 00 — Estrutura Conceitual", null, 2, 2);
  const cpc01 = await getOrCreateTopic(contabilidade.id, "CPC 01 — Impairment (Redução ao Valor Recuperável)", null, 2, 3);
  const cpc16 = await getOrCreateTopic(contabilidade.id, "CPC 16 — Estoques e Valoração", null, 2, 4);

  // ---- 2. Auditoria ----
  const auditoria = await prisma.subject.upsert({
    where: { examId_name: { examId: exam.id, name: "Auditoria" } },
    update: {},
    create: { examId: exam.id, name: "Auditoria", examWeight: 20, position: 2 },
  });

  const nbcTa200 = await getOrCreateTopic(auditoria.id, "NBC TA 200 — Objetivos Gerais do Auditor", null, 2, 1);
  const nbcTa300 = await getOrCreateTopic(auditoria.id, "NBC TA 300 — Planejamento da Auditoria", null, 2, 2);
  const nbcTa500 = await getOrCreateTopic(auditoria.id, "NBC TA 500 — Evidência de Auditoria", null, 3, 3);
  const nbcTa700 = await getOrCreateTopic(auditoria.id, "NBC TA 700 — Relatório e Opinião de Auditoria", null, 3, 4);

  // ---- 3. Direito Tributário ----
  const tributario = await prisma.subject.upsert({
    where: { examId_name: { examId: exam.id, name: "Direito Tributário" } },
    update: {},
    create: { examId: exam.id, name: "Direito Tributário", examWeight: 25, position: 3 },
  });

  const ctnCompetencia = await getOrCreateTopic(tributario.id, "CTN — Competência Tributária e Limitações", null, 3, 1);
  const ctnCredito = await getOrCreateTopic(tributario.id, "CTN — Lançamento e Suspensão/Extinção do Crédito", null, 3, 2);

  // ---- 4. Direito Administrativo ----
  const administrativo = await prisma.subject.upsert({
    where: { examId_name: { examId: exam.id, name: "Direito Administrativo" } },
    update: {},
    create: { examId: exam.id, name: "Direito Administrativo", examWeight: 15, position: 4 },
  });

  const licitacoes = await getOrCreateTopic(administrativo.id, "Lei 14.133/21 — Licitações e Contratos", null, 2, 1);
  const atosAdmin = await getOrCreateTopic(administrativo.id, "Atos Administrativos — Atributos e Anulação", null, 2, 2);

  // ---- 5. Direito Constitucional ----
  const constitucional = await prisma.subject.upsert({
    where: { examId_name: { examId: exam.id, name: "Direito Constitucional" } },
    update: {},
    create: { examId: exam.id, name: "Direito Constitucional", examWeight: 10, position: 5 },
  });

  const direitosFund = await getOrCreateTopic(constitucional.id, "Direitos e Garantias Fundamentais (Art. 5º)", null, 2, 1);

  // Lista expandida de questões
  const questionsData = [
    // --- CONTABILIDADE (Método Indireto, CPC 00, CPC 01, CPC 16) ---
    {
      topicId: metodoIndireto.id,
      statement: "Na elaboração da DFC pelo método indireto, o aumento do saldo de clientes durante o exercício deve ser:",
      options: [
        opt("A", "Somado ao lucro líquido, por representar ingresso de caixa"),
        opt("B", "Subtraído do lucro líquido, por representar receita reconhecida sem ingresso de caixa"),
        opt("C", "Ignorado, pois não afeta o fluxo de caixa operacional"),
        opt("D", "Classificado como atividade de investimento"),
        opt("E", "Classificado como atividade de financiamento"),
      ],
      correctAnswer: "B",
      explanation: "No método indireto, parte-se do lucro líquido e ajustam-se as variações do capital circulante. Aumento de clientes = receita reconhecida no resultado que ainda não virou caixa → subtrai-se do lucro líquido (CPC 03, atividade operacional).",
      board: "FGV",
      year: 2023,
      sourceExam: "RFB 2023 — Auditor-Fiscal",
      difficulty: 3,
    },
    {
      topicId: metodoIndireto.id,
      statement: "Pelo método indireto, a despesa de depreciação reconhecida no período deve ser:",
      options: [
        opt("A", "Somada ao lucro líquido, por não representar saída de caixa"),
        opt("B", "Subtraída do lucro líquido, por reduzir o resultado"),
        opt("C", "Apresentada como atividade de investimento"),
        opt("D", "Apresentada como atividade de financiamento"),
        opt("E", "Excluída da demonstração"),
      ],
      correctAnswer: "A",
      explanation: "Depreciação é despesa que reduz o lucro sem desembolso de caixa. No método indireto ela é somada de volta ao lucro líquido na conciliação com o caixa gerado pelas operações (CPC 03).",
      board: "FGV",
      year: 2022,
      sourceExam: "SEFAZ — FGV",
      difficulty: 2,
    },
    {
      topicId: cpc00.id,
      statement: "Segundo o CPC 00 (R2), as características qualitativas FUNDAMENTAIS da informação contábil-financeira útil são:",
      options: [
        opt("A", "Comparabilidade e tempestividade"),
        opt("B", "Relevância e representação fidedigna"),
        opt("C", "Verificabilidade e compreensibilidade"),
        opt("D", "Materialidade e prudência"),
        opt("E", "Essência sobre a forma e neutralidade"),
      ],
      correctAnswer: "B",
      explanation: "O CPC 00 (R2) divide as características em fundamentais (relevância e representação fidedigna) e de melhoria (comparabilidade, verificabilidade, tempestividade e compreensibilidade).",
      board: "FGV",
      year: 2023,
      sourceExam: "RFB 2023 — Auditor-Fiscal",
      difficulty: 2,
    },
    {
      topicId: cpc00.id,
      statement: "Conforme o CPC 00 (R2), um passivo é reconhecido quando:",
      options: [
        opt("A", "Houver certeza absoluta da saída de recursos"),
        opt("B", "For provável qualquer desembolso futuro, ainda que sem obrigação presente"),
        opt("C", "Existir obrigação presente resultante de eventos passados e o reconhecimento fornecer informação útil"),
        opt("D", "A administração decidir provisioná-lo por prudência"),
        opt("E", "Houver trânsito em julgado de decisão judicial, exclusivamente"),
      ],
      correctAnswer: "C",
      explanation: "No CPC 00 (R2), passivo é obrigação presente de transferir recurso econômico como resultado de eventos passados; o reconhecimento exige que produza informação relevante e representação fidedigna.",
      board: "FGV",
      year: 2023,
      sourceExam: "RFB 2023 — Auditor-Fiscal",
      difficulty: 3,
    },
    {
      topicId: cpc01.id,
      statement: "De acordo com o CPC 01 (Redução ao Valor Recuperável de Ativos), o valor recuperável de um ativo é definido como o MAIOR valor entre:",
      options: [
        opt("A", "O valor em uso e o valor justo líquido de despesas de venda"),
        opt("B", "O valor residual e o custo de aquisição deduzido da depreciação"),
        opt("C", "O valor contábil líquido e o valor de reposição no mercado"),
        opt("D", "O valor venal e o valor contratual de alienação"),
        opt("E", "O fluxo de caixa operacional e o valor patrimonial proporcional"),
      ],
      correctAnswer: "A",
      explanation: "Conforme o item 18 do CPC 01 (R1), o valor recuperável de um ativo ou de unidade geradora de caixa é o maior valor entre o seu valor justo líquido de despesas de venda e o seu valor em uso.",
      board: "FGV",
      year: 2023,
      sourceExam: "Receita Federal — Auditor-Fiscal",
      difficulty: 3,
    },
    {
      topicId: cpc16.id,
      statement: "Nos termos do CPC 16 (Estoques), os estoques devem ser mensurados pelo menor valor entre o custo de aquisição e o:",
      options: [
        opt("A", "Valor justo de mercado bruto"),
        opt("B", "Valor realizável líquido"),
        opt("C", "Custo de reposição histórico"),
        opt("D", "Valor presente dos fluxos operacionais descontados"),
        opt("E", "Preço de tabela sem descontos comerciais"),
      ],
      correctAnswer: "B",
      explanation: "De acordo com o item 9 do CPC 16 (R1), os estoques devem ser mensurados pelo valor de custo ou pelo valor realizável líquido, dos dois o menor.",
      board: "FGV",
      year: 2022,
      sourceExam: "SEFAZ-AM — Auditor Fiscal",
      difficulty: 2,
    },

    // --- AUDITORIA (NBC TA 200, 300, 500, 700) ---
    {
      topicId: nbcTa200.id,
      statement: "De acordo com a NBC TA 200, a segurança obtida pelo auditor em uma auditoria de demonstrações contábeis é razoável, e não absoluta, em decorrência das limitações inerentes ao trabalho.",
      options: [opt("A", "Certo"), opt("B", "Errado")],
      correctAnswer: "A",
      explanation: "A NBC TA 200 estabelece que segurança razoável é um nível elevado, porém não absoluto, de segurança — limitações inerentes incluem uso de testes por amostragem, natureza do julgamento e possibilidade de conluio.",
      board: "CEBRASPE",
      year: 2024,
      sourceExam: "TCU — Cebraspe (adaptada)",
      difficulty: 2,
    },
    {
      topicId: nbcTa300.id,
      statement: "Na etapa de planejamento da auditoria (NBC TA 300), o plano de auditoria é mais detalhado que a estratégia global de auditoria visto que inclui a natureza, a época e a extensão dos procedimentos de auditoria a serem realizados.",
      options: [opt("A", "Certo"), opt("B", "Errado")],
      correctAnswer: "A",
      explanation: "Conforme a NBC TA 300, a estratégia global define o alcance e a direção da auditoria, enquanto o plano de auditoria detalha a natureza, a época e a extensão dos procedimentos específicos de auditoria.",
      board: "CEBRASPE",
      year: 2023,
      sourceExam: "SEFAZ-PR — Auditor Fiscal",
      difficulty: 2,
    },
    {
      topicId: nbcTa500.id,
      statement: "A confiabilidade da evidência de auditoria é influenciada por sua fonte e por sua natureza. De acordo com a NBC TA 500, a evidência obtida diretamente pelo auditor é:",
      options: [
        opt("A", "Menos confiável que a obtida indiretamente pela administração"),
        opt("B", "Mais confiável que a evidência obtida indiretamente ou por inferência"),
        opt("C", "Igualmente confiável a declarações verbais da gerência"),
        opt("D", "Relevante apenas quando acompanhada de perícia judicial"),
        opt("E", "Desconsiderada quando obtida por meios eletrônicos externos"),
      ],
      correctAnswer: "B",
      explanation: "A NBC TA 500 estabelece que evidências obtidas diretamente pelo auditor (ex: observação direta da contagem física) são mais confiáveis do que evidências obtidas de forma indireta ou por inferência.",
      board: "FGV",
      year: 2023,
      sourceExam: "RFB 2023 — Auditor-Fiscal",
      difficulty: 2,
    },
    {
      topicId: nbcTa700.id,
      statement: "Quando o auditor conclui que, com base em evidência de auditoria apropriada e suficiente obtida, as demonstrações contábeis como um todo apresentam distorção relevante e generalizada, ele deve emitir uma opinião:",
      options: [
        opt("A", "Com ressalva"),
        opt("B", "Adversa"),
        opt("C", "Com abstenção de opinião"),
        opt("D", "Sem ressalva com parágrafo de ênfase"),
        opt("E", "Não modificada com incerteza relevante"),
      ],
      correctAnswer: "B",
      explanation: "De acordo com a NBC TA 705, o auditor deve emitir opinião adversa quando, tendo obtido evidência apropriada e suficiente, concluir que as distorções são tanto relevantes quanto generalizadas para as demonstrações contábeis.",
      board: "FGV",
      year: 2023,
      sourceExam: "RFB 2023 — Auditor-Fiscal",
      difficulty: 3,
    },

    // --- DIREITO TRIBUTÁRIO ---
    {
      topicId: ctnCompetencia.id,
      statement: "Nos termos do Código Tributário Nacional (CTN), a competência tributária é indelegável, salvo a atribuição das funções de arrecadar ou fiscalizar tributos, ou de executar leis, serviços, atos ou decisões administrativas em matéria tributária.",
      options: [opt("A", "Certo"), opt("B", "Errado")],
      correctAnswer: "A",
      explanation: "Art. 7º do CTN: A competência tributária é indelegável, salvo atribuição das funções de arrecadar ou fiscalizar tributos, ou de executar leis, serviços, atos ou decisões administrativas, conferida por uma pessoa jurídica de direito público a outra.",
      board: "CEBRASPE",
      year: 2024,
      sourceExam: "SEFAZ-AC — Auditor Fiscal",
      difficulty: 2,
    },
    {
      topicId: ctnCredito.id,
      statement: "Segundo o Art. 151 do CTN, suspendem a exigibilidade do crédito tributário, EXCETO:",
      options: [
        opt("A", "A moratória"),
        opt("B", "O depósito do seu montante integral"),
        opt("C", "As reclamações e os recursos administrativos nos termos das leis reguladoras do processo tributário"),
        opt("D", "A compensação e a transação tributária"),
        opt("E", "A concessão de medida liminar em mandado de segurança"),
      ],
      correctAnswer: "D",
      explanation: "A compensação e a transação tributária são modalidades de EXTINÇÃO do crédito tributário (Art. 156 do CTN). O Art. 151 prevê as causas de SUSPENSÃO (moratória, depósito integral, impugnações/recursos, liminares, tutela provisória e parcelamento).",
      board: "FGV",
      year: 2023,
      sourceExam: "RFB 2023 — Auditor-Fiscal",
      difficulty: 3,
    },

    // --- DIREITO ADMINISTRATIVO ---
    {
      topicId: licitacoes.id,
      statement: "Conforme a Nova Lei de Licitações (Lei nº 14.133/2021), a modalidade de licitação obrigatória para a alienação de bens imóveis ou de bens móveis inservíveis ou apreendidos é o:",
      options: [
        opt("A", "Pregão"),
        opt("B", "Concurso"),
        opt("C", "Leilão"),
        opt("D", "Diálogo Competitivo"),
        opt("E", "Concorrência pública vinculada"),
      ],
      correctAnswer: "C",
      explanation: "Art. 6º, XL, e Art. 31 da Lei 14.133/2021: Leilão é a modalidade de licitação para a alienação de bens imóveis ou de bens móveis inservíveis ou apreendidos a quem oferecer o maior lance.",
      board: "FGV",
      year: 2023,
      sourceExam: "SEFAZ-MG — Auditor Fiscal",
      difficulty: 2,
    },
    {
      topicId: atosAdmin.id,
      statement: "A revogação de um ato administrativo motivado por razões de conveniência e oportunidade produz efeitos:",
      options: [
        opt("A", "Ex tunc (retroativos à data de edição do ato)"),
        opt("B", "Ex nunc (não retroativos, respeitados os direitos adquiridos)"),
        opt("C", "Erga omnes absolutos e automáticos"),
        opt("D", "Condicionados à homologação do Poder Judiciário"),
        opt("E", "Repristinatórios automáticos sobre atos normativos anteriores"),
      ],
      correctAnswer: "B",
      explanation: "A revogação incide sobre ato legítimo/válido que se tornou inoportuno ou inconveniente, operando efeitos ex nunc (prospectivos/não retroativos). A anulação é que possui efeitos ex tunc.",
      board: "FGV",
      year: 2022,
      sourceExam: "CGU — Auditor Federal de Finanças e Controle",
      difficulty: 2,
    },

    // --- DIREITO CONSTITUCIONAL ---
    {
      topicId: direitosFund.id,
      statement: "Nos termos da Constituição Federal de 1988, a casa é asilo inviolável do indivíduo, ninguém nela podendo penetrar sem consentimento do morador, SALVO:",
      options: [
        opt("A", "Durante a noite, mediante ordem policial verbal e fundamentada"),
        opt("B", "Em caso de flagrante delito ou desastre, ou para prestar socorro, ou, durante o dia, por determinação judicial"),
        opt("C", "Para fiscalização tributária surpresa de mercadorias no período noturno"),
        opt("D", "Mediante autorização do Ministério Público a qualquer hora do dia ou da noite"),
        opt("E", "Exclusivamente após citação válida em processo de busca e apreensão civil"),
      ],
      correctAnswer: "B",
      explanation: "Art. 5º, XI, da CF/88: A casa é asilo inviolável do indivíduo, ninguém nela podendo penetrar sem consentimento do morador, salvo em caso de flagrante delito ou desastre, ou para prestar socorro, ou, durante o dia, por determinação judicial.",
      board: "FGV",
      year: 2023,
      sourceExam: "RFB 2023 — Auditor-Fiscal",
      difficulty: 1,
    },
  ];

  // Inserção idempotente das questões
  for (const qData of questionsData) {
    const existing = await prisma.question.findFirst({
      where: {
        topicId: qData.topicId,
        statement: qData.statement,
      },
    });

    if (!existing) {
      await prisma.question.create({
        data: qData,
      });
    }
  }

  const totalQuestions = await prisma.question.count();
  console.log(`Catálogo atualizado com sucesso! Total de questões na base: ${totalQuestions}.`);
}

/**
 * Histórico simulado de respostas do usuário demo (últimos ~8 dias)
 */
async function seedDemoHistory() {
  console.log("Atualizando histórico de respostas simulado...");
  await prisma.answerLog.deleteMany();
  await prisma.spacedRepetitionCard.deleteMany();

  // Garante a existência do usuário demo
  const demoUser = await prisma.user.upsert({
    where: { email: "demo@auditor-ai.dev" },
    update: {},
    create: {
      name: "Estudante Demo",
      email: "demo@auditor-ai.dev",
      phone: "+5516999990000",
      sendHour: 8,
      dailyGoal: 5,
    },
  });

  const users = await prisma.user.findMany({
    where: { active: true },
  });

  const questions = await prisma.question.findMany({
    include: { topic: true },
    orderBy: { id: "asc" },
  });

  const rateFor = (topicName: string) =>
    topicName === "Método Indireto"
      ? 0.4
      : topicName.includes("CPC 00")
        ? 0.85
        : topicName.includes("CTN")
          ? 0.78
          : 0.72;

  const DAY = 86_400_000;
  const now = Date.now();
  const logs: Prisma.AnswerLogCreateManyInput[] = [];

  for (const user of users) {
    // Matrícula automática nos editais
    const exam = await prisma.exam.findFirst();
    if (exam) {
      await prisma.enrollment.upsert({
        where: { userId_examId: { userId: user.id, examId: exam.id } },
        update: {},
        create: { userId: user.id, examId: exam.id },
      });
    }

    for (const [qi, q] of questions.entries()) {
      const card = await prisma.spacedRepetitionCard.upsert({
        where: { userId_questionId: { userId: user.id, questionId: q.id } },
        update: {},
        create: {
          userId: user.id,
          questionId: q.id,
          status: "REVIEW",
          dueAt: new Date(qi < 4 ? now - DAY : now + (qi + 1) * DAY),
          lastReviewedAt: new Date(now - DAY),
        },
      });

      const rate = rateFor(q.topic.name);
      // Gera até 6 respostas por questão ao longo dos últimos dias
      const total = Math.max(2, 6 - (qi % 4)); 
      for (let i = 0; i < total; i++) {
        const isCorrect = Math.floor((i + 1) * rate) > Math.floor(i * rate);
        const wrong: AnswerOption = q.correctAnswer === "A" ? "B" : "A";
        logs.push({
          userId: user.id,
          questionId: q.id,
          cardId: card.id,
          answer: isCorrect ? q.correctAnswer : wrong,
          isCorrect,
          channel: i % 2 === 0 ? "WHATSAPP" : "WEB",
          responseTimeMs: 18_000 + ((qi * 7 + i * 13) % 200) * 1_000,
          answeredAt: new Date(
            now - i * DAY - (((qi * 5 + i * 3) % 10) + 1) * 3_600_000,
          ),
        });
      }
    }
  }

  await prisma.answerLog.createMany({ data: logs });
  console.log(`Histórico atualizado: ${logs.length} respostas registradas para ${users.length} usuários.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
