/**
 * Põe a programação do banco exatamente como a PLANILHA da organização manda.
 *
 * A planilha ("Arenas", aba Programação) é a fonte declarada pela organização
 * e corrige o mapa de bolso impresso em vários horários e na arena de algumas
 * palestras. Os 26 registros abaixo foram transcritos dela, não digitados de
 * memória nem lidos do impresso.
 *
 * Roda SECO por padrão: sem `--apply` ele só relata o que mudaria. É a única
 * forma segura de mexer em dado de produção — dá para revisar a lista inteira
 * antes de qualquer escrita.
 *
 *   npx ts-node-dev --transpile-only src/scripts/aplicarProgramacaoDaPlanilha.ts
 *   npx ts-node-dev --transpile-only src/scripts/aplicarProgramacaoDaPlanilha.ts --apply
 *
 * Escreve as 26, e não só as divergentes: o que já está certo é reescrito com
 * o mesmo valor. Rodar duas vezes dá o mesmo resultado, e o resultado não
 * depende do estado em que o banco está agora.
 *
 * NÃO mexe em título, descrição nem palestrante. Vários títulos do banco são
 * versões ampliadas dos da planilha ("Premiação do Concurso O Quilo é Nosso"
 * contra "Premiação OQEN"), e a planilha não traz palestrantes — sobrescrever
 * pioraria o que o participante lê. Só horário, arena e categoria mudam.
 *
 * A correspondência é por TÍTULO, e não por arena + horário: horário e arena
 * são justamente o que pode estar errado no banco, e casar por eles faria uma
 * palestra com hora errada parecer inexistente e passar batida.
 */
import { prisma } from "../lib/prisma";

type Arena = "keeta" | "sebrae";

interface Atividade {
  arena: Arena;
  dia: string; // AAAA-MM-DD, horário de Brasília
  inicio: string; // HH:MM
  fim: string; // HH:MM
  titulo: string; // como escrito na planilha
}

// Como as arenas ficam nomeadas no banco depois desta execução. O impresso
// escreve só "ARENA KEETA" e "ARENA SEBRAE"; mantemos o número porque o banco
// já usa essa convenção e o pino do mapa mostra justamente ele ("1", "2") —
// sem o número o marcador viraria a letra "A" nos dois.
const ARENA: Record<Arena, { nome: string; categoria: string }> = {
  keeta: { nome: "Arena 1 - Keeta", categoria: "arena-1" },
  sebrae: { nome: "Arena 2 - Sebrae", categoria: "arena-2" },
};

// Transcrito da planilha, na ordem em que ela lista: Arena 1 e depois Arena 2,
// dia 1 e depois dia 2.
const PROGRAMACAO: Atividade[] = [
  // ---- ARENA 1 (KEETA) | 15 DE SETEMBRO ----
  { arena: "keeta", dia: "2026-09-15", inicio: "10:30", fim: "11:00", titulo: "Premiação OQEN" },
  { arena: "keeta", dia: "2026-09-15", inicio: "11:15", fim: "12:15", titulo: "O delivery por aplicativos está mudando rápido. Como aproveitar as oportunidades" },
  { arena: "keeta", dia: "2026-09-15", inicio: "12:30", fim: "13:30", titulo: "As canetas emagrecedoras vão escrever um novo capítulo no consumo?" },
  { arena: "keeta", dia: "2026-09-15", inicio: "13:45", fim: "14:45", titulo: "Mapeando 2027 – o que fazer hoje na gestão para não ser pego de surpresa no ano que vem" },
  { arena: "keeta", dia: "2026-09-15", inicio: "15:00", fim: "16:00", titulo: "RODA VIVA" },
  { arena: "keeta", dia: "2026-09-15", inicio: "16:05", fim: "17:20", titulo: "Comanda Aberta" },
  { arena: "keeta", dia: "2026-09-15", inicio: "17:30", fim: "18:30", titulo: "Geração Z: um jeito diferente de consumir" },
  { arena: "keeta", dia: "2026-09-15", inicio: "18:40", fim: "19:40", titulo: "Cardápio que dá lucro: como criar, precificar e ajustar para vender mais" },

  // ---- ARENA 1 (KEETA) | 16 DE SETEMBRO ----
  { arena: "keeta", dia: "2026-09-16", inicio: "10:30", fim: "11:45", titulo: "CLT, Frila, PJ, Intermitente: quais as formas mais adequadas de contratar no seu negócio" },
  { arena: "keeta", dia: "2026-09-16", inicio: "11:45", fim: "13:00", titulo: "A arte da promoção: como usar ofertas de modo eficiente sem queimar dinheiro" },
  { arena: "keeta", dia: "2026-09-16", inicio: "13:15", fim: "14:15", titulo: "Reforma Tributária: o que muda AGORA no seu negócio" },
  { arena: "keeta", dia: "2026-09-16", inicio: "14:30", fim: "15:30", titulo: "O novo momento das bebidas diante das mudanças aceleradas no consumo" },
  { arena: "keeta", dia: "2026-09-16", inicio: "15:45", fim: "17:00", titulo: "Experiência 4.0 e o desafio de criar recorrência" },
  { arena: "keeta", dia: "2026-09-16", inicio: "17:15", fim: "18:15", titulo: "O cliente e a nova jornada do atendimento" },

  // ---- ARENA 2 (SEBRAE) | 15 DE SETEMBRO ----
  { arena: "sebrae", dia: "2026-09-15", inicio: "11:30", fim: "12:00", titulo: "Premiação Missão Empreendedora" },
  { arena: "sebrae", dia: "2026-09-15", inicio: "12:30", fim: "13:30", titulo: "Economia para o planeta, dinheiro no bolso - a eficiência energética como aliada no resultado" },
  { arena: "sebrae", dia: "2026-09-15", inicio: "13:45", fim: "14:45", titulo: "Como atrair, gerir e reter talentos num mundo cada vez mais digital" },
  { arena: "sebrae", dia: "2026-09-15", inicio: "16:00", fim: "17:15", titulo: "IA na prática: como os agentes estão se tornando seus novos colegas de trabalho" },
  { arena: "sebrae", dia: "2026-09-15", inicio: "17:30", fim: "18:30", titulo: "Eficiência no delivery: as boas práticas que podem fazer seu negócio decolar" },
  { arena: "sebrae", dia: "2026-09-15", inicio: "18:45", fim: "19:45", titulo: "Gestão inteligente: os dados integrados como base para transformar o seu negócio" },

  // ---- ARENA 2 (SEBRAE) | 16 DE SETEMBRO ----
  { arena: "sebrae", dia: "2026-09-16", inicio: "10:30", fim: "11:30", titulo: "A alimentação saudável e o uso de produtos locais como tendências de negócio" },
  { arena: "sebrae", dia: "2026-09-16", inicio: "11:30", fim: "13:00", titulo: "Grandes Compradores: os pulos do gato" },
  { arena: "sebrae", dia: "2026-09-16", inicio: "13:00", fim: "14:15", titulo: "A nova economia dos criadores: como lidar com influenciadores e (por que não?) tornar-se um deles" },
  { arena: "sebrae", dia: "2026-09-16", inicio: "14:45", fim: "15:30", titulo: "A IA como alavanca na melhoria do seu negócio" },
  { arena: "sebrae", dia: "2026-09-16", inicio: "16:00", fim: "17:15", titulo: "Comanda Aberta" },
  { arena: "sebrae", dia: "2026-09-16", inicio: "17:30", fim: "18:30", titulo: "Super El Niño e mudanças climáticas: oportunidades e riscos para negócios de alimentação fora do lar" },
];

// O evento acontece em Brasília; um horário sem fuso seria interpretado como
// UTC e a programação inteira andaria três horas.
const FUSO_BRASILIA = "-03:00";
const emBrasilia = (dia: string, hora: string) => new Date(`${dia}T${hora}:00${FUSO_BRASILIA}`);

// A planilha abrevia onde o banco escreve por extenso. Onde a abreviação não
// é um prefixo do título completo, a equivalência precisa ser declarada.
const APELIDOS: Record<string, string> = {
  "premiacao oqen": "premiacao do concurso o quilo e nosso",
};

/** Título reduzido ao que dá para comparar: sem acento, caixa ou pontuação. */
function palavras(titulo: string): string[] {
  const limpo = titulo
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\./g, "") // "I.A." e "IA" são a mesma coisa
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return (APELIDOS[limpo] ?? limpo).split(" ");
}

/**
 * Um título é o mesmo do outro quando um é começo do outro — o banco costuma
 * trazer a versão curta ("Reforma Tributária") do que a planilha escreve por
 * extenso, e vice-versa. Exige duas palavras em comum para que um título de
 * uma palavra só não case com meia programação.
 */
function mesmoTitulo(a: string[], b: string[]): boolean {
  const n = Math.min(a.length, b.length);
  if (n < 2) return a.length === b.length && a[0] === b[0];
  for (let i = 0; i < n; i++) if (a[i] !== b[i]) return false;
  return true;
}

const APLICAR = process.argv.includes("--apply");

async function main() {
  const eventos = await prisma.event.findMany({ orderBy: { startTime: "asc" } });

  const usados = new Set<string>();
  let escritos = 0;
  let jaCertos = 0;
  const semPar: Atividade[] = [];

  // Em ordem de programação dos dois lados: as duas "Comanda Aberta" têm o
  // mesmo título, e percorrer na ordem do cronograma faz a do dia 15 casar
  // com a do dia 15 sem depender de nenhum campo que possa estar errado.
  for (const atividade of PROGRAMACAO) {
    const chave = palavras(atividade.titulo);
    const evento = eventos.find((e) => !usados.has(e.id) && mesmoTitulo(chave, palavras(e.title)));

    if (!evento) {
      semPar.push(atividade);
      continue;
    }
    usados.add(evento.id);

    const inicio = emBrasilia(atividade.dia, atividade.inicio);
    const fim = emBrasilia(atividade.dia, atividade.fim);
    const { nome, categoria } = ARENA[atividade.arena];

    const mudancas: string[] = [];
    if (evento.startTime.getTime() !== inicio.getTime()) {
      mudancas.push(`início: ${brasilia(evento.startTime)} -> ${brasilia(inicio)}`);
    }
    if (evento.endTime.getTime() !== fim.getTime()) {
      mudancas.push(`término: ${brasilia(evento.endTime)} -> ${brasilia(fim)}`);
    }
    if (evento.locationName !== nome) {
      mudancas.push(`arena: ${evento.locationName} -> ${nome}`);
    }
    if ((evento.category ?? null) !== categoria) {
      mudancas.push(`categoria: ${evento.category ?? "(vazia)"} -> ${categoria}`);
    }

    if (mudancas.length > 0) {
      escritos++;
      console.log(`\n${evento.title.slice(0, 66)}`);
      mudancas.forEach((m) => console.log(`   ${m}`));
    } else {
      jaCertos++;
    }

    if (APLICAR) {
      await prisma.event.update({
        where: { id: evento.id },
        data: { startTime: inicio, endTime: fim, locationName: nome, category: categoria },
      });
    }
  }

  // Sobras nos dois sentidos. Este script não cria nem apaga nada — mas quem
  // roda precisa saber que sobrou, para decidir o que fazer com a sobra.
  const semParNoBanco = eventos.filter((e) => !usados.has(e.id));

  console.log(`\n${"=".repeat(52)}`);
  console.log(`palestras na planilha:  ${PROGRAMACAO.length}`);
  console.log(`eventos no banco:       ${eventos.length}`);
  console.log(`já conforme a planilha: ${jaCertos}`);
  console.log(`${APLICAR ? "corrigidos:            " : "seriam corrigidos:     "} ${escritos}`);

  if (semPar.length) {
    console.log(`\nda planilha sem par no banco (NÃO criados):`);
    semPar.forEach((a) => console.log(`   ${a.arena} ${a.dia} ${a.inicio} — ${a.titulo}`));
  }
  if (semParNoBanco.length) {
    console.log(`\nno banco sem par na planilha (NÃO apagados):`);
    semParNoBanco.forEach((e) => console.log(`   ${brasilia(e.startTime)} ${e.locationName} — ${e.title}`));
  }
  if (!APLICAR) console.log(`\nNada foi gravado. Rode com --apply para aplicar.`);
}

const brasilia = (d: Date) =>
  d.toLocaleString("pt-BR", {
    timeZone: "America/Sao_Paulo",
    day: "2-digit",
    month: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

main()
  .catch((e) => {
    console.error("Falhou:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
