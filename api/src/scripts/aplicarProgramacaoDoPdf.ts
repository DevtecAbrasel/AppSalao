/**
 * Alinha a programação do banco com o mapa de bolso impresso do evento
 * (mapa_de_bolso_v2, páginas de PROGRAMAÇÃO), que é a referência oficial.
 *
 * Roda seco por padrão: sem `--apply` ele apenas relata o que mudaria. É a
 * única forma segura de mexer em dado de produção — dá para revisar a lista
 * inteira antes de qualquer escrita.
 *
 *   npx ts-node-dev --transpile-only src/scripts/aplicarProgramacaoDoPdf.ts
 *   npx ts-node-dev --transpile-only src/scripts/aplicarProgramacaoDoPdf.ts --apply
 *
 * A correspondência é feita por ARENA + DIA + HORÁRIO DE INÍCIO, e não pelo
 * título: o título é justamente um dos campos que podem estar diferentes, e
 * casar por ele faria a atividade "sumir" e ser tratada como nova.
 *
 * Idempotente: rodar duas vezes não muda nada na segunda.
 */
import { prisma } from "../lib/prisma";

// Como as arenas ficam nomeadas no banco depois desta execução.
//
// O impresso escreve só "ARENA KEETA" e "ARENA SEBRAE". Mantemos o número
// porque o banco já usa essa convenção e o pino do mapa mostra justamente ele
// ("1", "2") — sem o número o marcador viraria a letra "A" nos dois. A
// mudança de conteúdo que o impresso traz (Ambev -> Sebrae) está aplicada.
// Para usar a forma literal do impresso, troque pelos valores comentados.
const NOME_ARENA: Record<Arena, string> = {
  keeta: "Arena 1 - Keeta", // literal do impresso: "Arena Keeta"
  sebrae: "Arena 2 - Sebrae", // literal do impresso: "Arena Sebrae"
};

type Arena = "keeta" | "sebrae";

interface Atividade {
  arena: Arena;
  dia: string; // AAAA-MM-DD, horário de Brasília
  inicio: string; // HH:MM
  fim: string; // HH:MM
  titulo: string;
  palestrantes: string[];
}

// Transcrito do PDF. Um palestrante por barra, na ordem impressa; lista vazia
// quando a atividade não credita ninguém.
const PROGRAMACAO: Atividade[] = [
  // ---- ARENA KEETA | 15 DE SETEMBRO ----
  { arena: "keeta", dia: "2026-09-15", inicio: "10:30", fim: "11:00", titulo: "Premiação do Concurso O Quilo é Nosso", palestrantes: [] },
  { arena: "keeta", dia: "2026-09-15", inicio: "11:15", fim: "12:15", titulo: "O delivery por aplicativos está mudando rápido. Como aproveitar as oportunidades", palestrantes: ["Rapha Silva", "Danilo Mansano"] },
  { arena: "keeta", dia: "2026-09-15", inicio: "12:30", fim: "13:30", titulo: "Economia para o planeta, dinheiro no bolso - a eficiência energética como aliada no resultado", palestrantes: ["Lara Vieira"] },
  { arena: "keeta", dia: "2026-09-15", inicio: "13:45", fim: "14:45", titulo: "Mapeando 2027: o que fazer hoje na gestão para não ser pego de surpresa no ano que vem", palestrantes: ["Daniel Lucco", "Marcelo Marani", "Guilherme Freitas"] },
  { arena: "keeta", dia: "2026-09-15", inicio: "15:00", fim: "16:00", titulo: "Roda Viva", palestrantes: ["Jefferson Rueda"] },
  { arena: "keeta", dia: "2026-09-15", inicio: "16:00", fim: "17:15", titulo: "Comanda Aberta", palestrantes: [] },
  { arena: "keeta", dia: "2026-09-15", inicio: "17:30", fim: "18:30", titulo: "Geração Z: um jeito diferente de consumir", palestrantes: ["Cris Souza", "Filipe Tosta"] },
  { arena: "keeta", dia: "2026-09-15", inicio: "18:45", fim: "19:45", titulo: "Cardápio que dá lucro: como criar, precificar e ajustar para vender mais", palestrantes: ["Augusto Rech Neto", "Marcio Blak"] },

  // ---- ARENA KEETA | 16 DE SETEMBRO ----
  { arena: "keeta", dia: "2026-09-16", inicio: "10:30", fim: "11:45", titulo: "CLT, frila, PJ, intermitente: quais as formas mais adequadas de contratar no seu negócio", palestrantes: ["Ana Paula Cardoso", "Célio Salles"] },
  { arena: "keeta", dia: "2026-09-16", inicio: "11:45", fim: "13:00", titulo: "A arte da promoção: como usar ofertas de modo eficiente sem queimar dinheiro", palestrantes: ["Pedro Leite", "Molinari"] },
  { arena: "keeta", dia: "2026-09-16", inicio: "13:15", fim: "14:15", titulo: "O cliente e a nova jornada do atendimento", palestrantes: ["Ivan Achcar", "Rodrigo Goulart"] },
  { arena: "keeta", dia: "2026-09-16", inicio: "14:30", fim: "15:30", titulo: "O novo momento das bebidas diante das mudanças aceleradas no consumo", palestrantes: ["Ana Paula (Ambev)", "Diego Bertolini"] },
  { arena: "keeta", dia: "2026-09-16", inicio: "15:45", fim: "17:00", titulo: "Experiência 4.0 e o desafio de criar recorrência", palestrantes: ["Matheus Lessa", "Leo Corvo"] },
  { arena: "keeta", dia: "2026-09-16", inicio: "17:30", fim: "18:30", titulo: "Reforma Tributária", palestrantes: ["Anderson Trautman"] },

  // ---- ARENA SEBRAE | 15 DE SETEMBRO ----
  { arena: "sebrae", dia: "2026-09-15", inicio: "11:30", fim: "12:00", titulo: "Premiação Missão Empreendedora", palestrantes: [] },
  { arena: "sebrae", dia: "2026-09-15", inicio: "12:15", fim: "13:30", titulo: "As canetas emagrecedoras vão escrever um novo capítulo no consumo?", palestrantes: ["Antonio Aguiar (Tombé)", "Alessandra Gaidargi"] },
  { arena: "sebrae", dia: "2026-09-15", inicio: "13:45", fim: "14:45", titulo: "Como atrair, gerir e reter talentos num mundo cada vez mais digital", palestrantes: ["Daniel Castello", "Willian Gil"] },
  { arena: "sebrae", dia: "2026-09-15", inicio: "16:00", fim: "17:15", titulo: "I.A. na prática: como os agentes estão se tornando seus novos colegas de trabalho", palestrantes: ["Matheus Mason", "Aline Sordili", "Guilherme Junqueira"] },
  { arena: "sebrae", dia: "2026-09-15", inicio: "17:30", fim: "18:30", titulo: "Eficiência no delivery: as boas práticas que podem fazer seu negócio decolar", palestrantes: ["Filipe Mello", "Bruno Rossini"] },
  { arena: "sebrae", dia: "2026-09-15", inicio: "18:45", fim: "19:45", titulo: "Gestão inteligente: os dados integrados como base para transformar o seu negócio", palestrantes: ["Fabio Martins", "Thiago Falcão", "Píndaro Lutero"] },

  // ---- ARENA SEBRAE | 16 DE SETEMBRO ----
  { arena: "sebrae", dia: "2026-09-16", inicio: "10:30", fim: "11:30", titulo: "A alimentação saudável e o uso de produtos locais como tendências de negócio", palestrantes: ["Monica SVB", "Fran Tisato"] },
  { arena: "sebrae", dia: "2026-09-16", inicio: "11:30", fim: "13:00", titulo: "Grandes compradores: os pulos do gato", palestrantes: ["Diego Senra"] },
  { arena: "sebrae", dia: "2026-09-16", inicio: "13:00", fim: "14:15", titulo: "A nova economia dos criadores: como lidar com influenciadores e (por que não?) tornar-se um deles", palestrantes: ["Carole Crema", "Leo Soltz", "Bruno Gomes", "Felipe Assis"] },
  { arena: "sebrae", dia: "2026-09-16", inicio: "14:45", fim: "15:30", titulo: "A I.A. como alavanca na melhoria do seu negócio", palestrantes: [] },
  { arena: "sebrae", dia: "2026-09-16", inicio: "16:00", fim: "17:15", titulo: "Comanda Aberta", palestrantes: [] },
  { arena: "sebrae", dia: "2026-09-16", inicio: "17:30", fim: "18:30", titulo: "Super El Niño e mudanças climáticas: oportunidades e riscos para negócios de alimentação fora do lar", palestrantes: ["Gustavo Bentes", "Beatriz Proença"] },
];

// O evento acontece em Brasília; um horário sem fuso seria interpretado como
// UTC e a programação inteira andaria três horas.
const FUSO_BRASILIA = "-03:00";
const emBrasilia = (dia: string, hora: string) => new Date(`${dia}T${hora}:00${FUSO_BRASILIA}`);

/** Qual arena é este local, tolerando número, patrocinador novo e antigo. */
function arenaDoLocal(locationName: string): Arena | null {
  if (/^\s*arena\b.*(\b1\b|keeta)/i.test(locationName)) return "keeta";
  if (/^\s*arena\b.*(\b2\b|sebrae|ambev)/i.test(locationName)) return "sebrae";
  return null;
}

const APLICAR = process.argv.includes("--apply");

async function main() {
  const eventos = await prisma.event.findMany({ orderBy: { startTime: "asc" } });

  let alterados = 0;
  let iguais = 0;
  const semPar: Atividade[] = [];
  const naoReconhecidos: string[] = [];

  for (const atividade of PROGRAMACAO) {
    const inicio = emBrasilia(atividade.dia, atividade.inicio);
    const fim = emBrasilia(atividade.dia, atividade.fim);

    const evento = eventos.find(
      (e) =>
        arenaDoLocal(e.locationName) === atividade.arena &&
        e.startTime.getTime() === inicio.getTime()
    );

    if (!evento) {
      semPar.push(atividade);
      continue;
    }

    const speaker = atividade.palestrantes.join(", ") || null;
    const locationName = NOME_ARENA[atividade.arena];

    const mudancas: string[] = [];
    if (evento.title !== atividade.titulo) mudancas.push(`título:\n      de: ${evento.title}\n     para: ${atividade.titulo}`);
    if ((evento.speaker ?? null) !== speaker) mudancas.push(`palestrantes:\n      de: ${evento.speaker ?? "(vazio)"}\n     para: ${speaker ?? "(vazio)"}`);
    if (evento.locationName !== locationName) mudancas.push(`local:\n      de: ${evento.locationName}\n     para: ${locationName}`);
    if (evento.endTime.getTime() !== fim.getTime()) mudancas.push(`término:\n      de: ${evento.endTime.toISOString()}\n     para: ${fim.toISOString()}`);

    if (mudancas.length === 0) {
      iguais++;
      continue;
    }

    alterados++;
    console.log(`\n[${atividade.arena}] ${atividade.dia} ${atividade.inicio}`);
    mudancas.forEach((m) => console.log(`   ${m}`));

    if (APLICAR) {
      await prisma.event.update({
        where: { id: evento.id },
        data: { title: atividade.titulo, speaker, locationName, endTime: fim },
      });
    }
  }

  // Sobras nos dois sentidos: nada é apagado nem criado por este script, mas
  // é preciso saber que existem para alguém decidir o que fazer.
  for (const e of eventos) {
    if (!arenaDoLocal(e.locationName)) {
      naoReconhecidos.push(`${e.locationName} — ${e.title}`);
      continue;
    }
    const bate = PROGRAMACAO.some(
      (a) =>
        a.arena === arenaDoLocal(e.locationName) &&
        emBrasilia(a.dia, a.inicio).getTime() === e.startTime.getTime()
    );
    if (!bate) naoReconhecidos.push(`sem par no PDF: ${e.locationName} ${e.startTime.toISOString()} — ${e.title}`);
  }

  console.log(`\n${"=".repeat(50)}`);
  console.log(`atividades no PDF:        ${PROGRAMACAO.length}`);
  console.log(`eventos no banco:         ${eventos.length}`);
  console.log(`já idênticos:             ${iguais}`);
  console.log(`${APLICAR ? "atualizados" : "seriam atualizados"}: ${alterados}`);
  if (semPar.length) {
    console.log(`\ndo PDF sem evento correspondente (NÃO criados):`);
    semPar.forEach((a) => console.log(`   ${a.arena} ${a.dia} ${a.inicio} — ${a.titulo}`));
  }
  if (naoReconhecidos.length) {
    console.log(`\nno banco sem correspondência (NÃO apagados):`);
    naoReconhecidos.forEach((s) => console.log(`   ${s}`));
  }
  if (!APLICAR) console.log(`\nNada foi gravado. Rode com --apply para aplicar.`);
}

main()
  .catch((e) => {
    console.error("Falhou:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
