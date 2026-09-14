import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// Programação oficial do Salão Abrasel 2026 (15 e 16/09), Arena 1 - Keeta e
// Arena 2 - Sebrae, extraída da planilha de cronograma fornecida pela equipe.
//
// A Arena 2 já se chamou "Arena 2 - Ambev": o patrocínio mudou depois que a
// planilha foi montada. Quem for corrigir um banco já populado NÃO deve rodar
// este seed de novo — ele usa `create`, então duplicaria os 26 eventos. É um
// UPDATE na coluna `location_name` (ver a nota na PR que fez esta troca).
const SCHEDULE_EVENTS = [
  {
    title: "Premiação OQEN",
    description:
      "Premiação OQEN.",
    speaker: null,
    locationName: "Arena 1 - Keeta",
    locationMapX: 0.6234,
    locationMapY: 0.7902,
    startTime: new Date("2026-09-15T10:30:00-03:00"),
    endTime: new Date("2026-09-15T11:00:00-03:00"),
    category: "arena-1",
  },
  {
    title: "O delivery por aplicativos está mudando rápido. Como aproveitar as oportunidades",
    description:
      "O delivery por aplicativos está mudando rápido. Como aproveitar as oportunidades. Com Rapha Silva, Danilo Mansano.",
    speaker: "Rapha Silva, Danilo Mansano",
    locationName: "Arena 1 - Keeta",
    locationMapX: 0.6234,
    locationMapY: 0.7902,
    startTime: new Date("2026-09-15T11:15:00-03:00"),
    endTime: new Date("2026-09-15T12:15:00-03:00"),
    category: "arena-1",
  },
  {
    title: "Economia para o planeta, dinheiro no bolso - a eficiência energética como aliada no resultado",
    description:
      "Economia para o planeta, dinheiro no bolso - a eficiência energética como aliada no resultado. Com Leandro Andriani, Lara Vieira.",
    speaker: "Leandro Andriani, Lara Vieira (moderação: Lílian Silva)",
    locationName: "Arena 1 - Keeta",
    locationMapX: 0.6234,
    locationMapY: 0.7902,
    startTime: new Date("2026-09-15T12:30:00-03:00"),
    endTime: new Date("2026-09-15T13:30:00-03:00"),
    category: "arena-1",
  },
  {
    title: "Mapeando 2027 – o que fazer hoje na gestão para não ser pego de surpresa no ano que vem",
    description:
      "Mapeando 2027 – o que fazer hoje na gestão para não ser pego de surpresa no ano que vem. Com Daniel Lucco, Marcelo Marani, Guilherme Freitas.",
    speaker: "Daniel Lucco, Marcelo Marani, Guilherme Freitas",
    locationName: "Arena 1 - Keeta",
    locationMapX: 0.6234,
    locationMapY: 0.7902,
    startTime: new Date("2026-09-15T13:45:00-03:00"),
    endTime: new Date("2026-09-15T14:45:00-03:00"),
    category: "arena-1",
  },
  {
    title: "Roda Viva",
    description:
      "Roda Viva. Com Jefferson Rueda.",
    speaker: "Jefferson Rueda",
    locationName: "Arena 1 - Keeta",
    locationMapX: 0.6234,
    locationMapY: 0.7902,
    startTime: new Date("2026-09-15T15:00:00-03:00"),
    endTime: new Date("2026-09-15T16:00:00-03:00"),
    category: "arena-1",
  },
  {
    title: "Comanda Aberta",
    description:
      "Comanda Aberta.",
    speaker: null,
    locationName: "Arena 1 - Keeta",
    locationMapX: 0.6234,
    locationMapY: 0.7902,
    startTime: new Date("2026-09-15T16:00:00-03:00"),
    endTime: new Date("2026-09-15T17:15:00-03:00"),
    category: "arena-1",
  },
  {
    title: "Geração Z: um jeito diferente de consumir",
    description:
      "Geração Z: um jeito diferente de consumir. Com Cris Souza, Filipe Tosta.",
    speaker: "Cris Souza, Filipe Tosta",
    locationName: "Arena 1 - Keeta",
    locationMapX: 0.6234,
    locationMapY: 0.7902,
    startTime: new Date("2026-09-15T17:30:00-03:00"),
    endTime: new Date("2026-09-15T18:30:00-03:00"),
    category: "arena-1",
  },
  {
    title: "Cardápio que dá lucro: como criar, precificar e ajustar para vender mais",
    description:
      "Cardápio que dá lucro: como criar, precificar e ajustar para vender mais. Com Augusto Rech Neto, Marcio Blak.",
    speaker: "Augusto Rech Neto, Marcio Blak",
    locationName: "Arena 1 - Keeta",
    locationMapX: 0.6234,
    locationMapY: 0.7902,
    startTime: new Date("2026-09-15T18:45:00-03:00"),
    endTime: new Date("2026-09-15T19:45:00-03:00"),
    category: "arena-1",
  },
  {
    title: "Premiação Missão Empreendedora",
    description:
      "Premiação Missão Empreendedora.",
    speaker: null,
    locationName: "Arena 2 - Sebrae",
    locationMapX: 0.2596,
    locationMapY: 0.7866,
    startTime: new Date("2026-09-15T11:30:00-03:00"),
    endTime: new Date("2026-09-15T12:00:00-03:00"),
    category: "arena-2",
  },
  {
    title: "As canetas emagrecedoras vão escrever um novo capítulo no consumo?",
    description:
      "As canetas emagrecedoras vão escrever um novo capítulo no consumo?. Com Antônio Aguiar (Tombé), Alessandra Gaidargi.",
    speaker: "Antônio Aguiar (Tombé), Alessandra Gaidargi",
    locationName: "Arena 2 - Sebrae",
    locationMapX: 0.2596,
    locationMapY: 0.7866,
    startTime: new Date("2026-09-15T12:15:00-03:00"),
    endTime: new Date("2026-09-15T13:30:00-03:00"),
    category: "arena-2",
  },
  {
    title: "Como atrair, gerir e reter talentos num mundo cada vez mais digital",
    description:
      "Como atrair, gerir e reter talentos num mundo cada vez mais digital. Com Daniel Castello, William Gil.",
    speaker: "Daniel Castello, William Gil",
    locationName: "Arena 2 - Sebrae",
    locationMapX: 0.2596,
    locationMapY: 0.7866,
    startTime: new Date("2026-09-15T13:45:00-03:00"),
    endTime: new Date("2026-09-15T14:45:00-03:00"),
    category: "arena-2",
  },
  {
    title: "IA na prática: como os agentes estão se tornando seus novos colegas de trabalho",
    description:
      "IA na prática: como os agentes estão se tornando seus novos colegas de trabalho. Com Matheus Mason, Aline Sordili, Guilherme Junqueira.",
    speaker: "Matheus Mason, Aline Sordili, Guilherme Junqueira",
    locationName: "Arena 2 - Sebrae",
    locationMapX: 0.2596,
    locationMapY: 0.7866,
    startTime: new Date("2026-09-15T16:00:00-03:00"),
    endTime: new Date("2026-09-15T17:15:00-03:00"),
    category: "arena-2",
  },
  {
    title: "Eficiência no delivery: as boas práticas que podem fazer seu negócio decolar",
    description:
      "Eficiência no delivery: as boas práticas que podem fazer seu negócio decolar. Com Filipe Mello, Bruno Rossini.",
    speaker: "Filipe Mello, Bruno Rossini",
    locationName: "Arena 2 - Sebrae",
    locationMapX: 0.2596,
    locationMapY: 0.7866,
    startTime: new Date("2026-09-15T17:30:00-03:00"),
    endTime: new Date("2026-09-15T18:30:00-03:00"),
    category: "arena-2",
  },
  {
    title: "Gestão inteligente: os dados integrados como base para transformar o seu negócio",
    description:
      "Gestão inteligente: os dados integrados como base para transformar o seu negócio. Com Fabio Martins, Thiago Falcão, Píndaro Lutero.",
    speaker: "Fabio Martins, Thiago Falcão, Píndaro Lutero",
    locationName: "Arena 2 - Sebrae",
    locationMapX: 0.2596,
    locationMapY: 0.7866,
    startTime: new Date("2026-09-15T18:45:00-03:00"),
    endTime: new Date("2026-09-15T19:45:00-03:00"),
    category: "arena-2",
  },
  {
    title: "CLT, Frila, PJ, Intermitente: quais as formas mais adequadas de contratar no seu negócio",
    description:
      "CLT, Frila, PJ, Intermitente: quais as formas mais adequadas de contratar no seu negócio. Com Ana Paula Cardoso, Célio Salles.",
    speaker: "Ana Paula Cardoso, Célio Salles",
    locationName: "Arena 1 - Keeta",
    locationMapX: 0.6234,
    locationMapY: 0.7902,
    startTime: new Date("2026-09-16T10:30:00-03:00"),
    endTime: new Date("2026-09-16T11:45:00-03:00"),
    category: "arena-1",
  },
  {
    title: "A arte da promoção: como usar ofertas de modo eficiente sem queimar dinheiro",
    description:
      "A arte da promoção: como usar ofertas de modo eficiente sem queimar dinheiro. Com Pedro Leite, Sérgio Molinari.",
    speaker: "Pedro Leite, Sérgio Molinari",
    locationName: "Arena 1 - Keeta",
    locationMapX: 0.6234,
    locationMapY: 0.7902,
    startTime: new Date("2026-09-16T11:45:00-03:00"),
    endTime: new Date("2026-09-16T13:00:00-03:00"),
    category: "arena-1",
  },
  {
    title: "O cliente e a nova jornada do atendimento",
    description:
      "O cliente e a nova jornada do atendimento. Com Ivan Achcar, Rodrigo Goulart.",
    speaker: "Ivan Achcar, Rodrigo Goulart",
    locationName: "Arena 1 - Keeta",
    locationMapX: 0.6234,
    locationMapY: 0.7902,
    startTime: new Date("2026-09-16T13:15:00-03:00"),
    endTime: new Date("2026-09-16T14:15:00-03:00"),
    category: "arena-1",
  },
  {
    title: "O novo momento das bebidas diante das mudanças aceleradas no consumo",
    description:
      "O novo momento das bebidas diante das mudanças aceleradas no consumo. Com Ana Paula (Ambev), Diego Bertolini.",
    speaker: "Ana Paula (Ambev), Diego Bertolini",
    locationName: "Arena 1 - Keeta",
    locationMapX: 0.6234,
    locationMapY: 0.7902,
    startTime: new Date("2026-09-16T14:30:00-03:00"),
    endTime: new Date("2026-09-16T15:30:00-03:00"),
    category: "arena-1",
  },
  {
    title: "Experiência 4.0 e o desafio de criar recorrência",
    description:
      "Experiência 4.0 e o desafio de criar recorrência. Com Matheus Lessa, Leo Corvo.",
    speaker: "Matheus Lessa, Leo Corvo",
    locationName: "Arena 1 - Keeta",
    locationMapX: 0.6234,
    locationMapY: 0.7902,
    startTime: new Date("2026-09-16T15:45:00-03:00"),
    endTime: new Date("2026-09-16T17:00:00-03:00"),
    category: "arena-1",
  },
  {
    title: "Reforma Tributária: o que muda AGORA no seu negócio",
    description:
      "Reforma Tributária: o que muda AGORA no seu negócio. Com Anderson Trautman.",
    speaker: "Anderson Trautman",
    locationName: "Arena 1 - Keeta",
    locationMapX: 0.6234,
    locationMapY: 0.7902,
    startTime: new Date("2026-09-16T17:30:00-03:00"),
    endTime: new Date("2026-09-16T18:30:00-03:00"),
    category: "arena-1",
  },
  {
    title: "A alimentação saudável e o uso de produtos locais como tendências de negócio",
    description:
      "A alimentação saudável e o uso de produtos locais como tendências de negócio. Com Monica SVB.",
    speaker: "Monica SVB",
    locationName: "Arena 2 - Sebrae",
    locationMapX: 0.2596,
    locationMapY: 0.7866,
    startTime: new Date("2026-09-16T10:30:00-03:00"),
    endTime: new Date("2026-09-16T11:30:00-03:00"),
    category: "arena-2",
  },
  {
    title: "Grandes Compradores: os pulos do gato",
    description:
      "Grandes Compradores: os pulos do gato. Com Diego Senra.",
    speaker: "Diego Senra",
    locationName: "Arena 2 - Sebrae",
    locationMapX: 0.2596,
    locationMapY: 0.7866,
    startTime: new Date("2026-09-16T11:30:00-03:00"),
    endTime: new Date("2026-09-16T13:00:00-03:00"),
    category: "arena-2",
  },
  {
    title: "A nova economia dos criadores: como lidar com influenciadores e (por que não?) tornar-se um deles",
    description:
      "A nova economia dos criadores: como lidar com influenciadores e (por que não?) tornar-se um deles. Com Carole Crema, Leo Soltz, Bruno Gomes, Felipe Assis.",
    speaker: "Carole Crema, Leo Soltz, Bruno Gomes, Felipe Assis",
    locationName: "Arena 2 - Sebrae",
    locationMapX: 0.2596,
    locationMapY: 0.7866,
    startTime: new Date("2026-09-16T13:00:00-03:00"),
    endTime: new Date("2026-09-16T14:15:00-03:00"),
    category: "arena-2",
  },
  {
    title: "A IA como alavanca na melhoria do seu negócio",
    description:
      "A IA como alavanca na melhoria do seu negócio. Com Google, Sebrae.",
    speaker: "Google, Sebrae",
    locationName: "Arena 2 - Sebrae",
    locationMapX: 0.2596,
    locationMapY: 0.7866,
    startTime: new Date("2026-09-16T14:45:00-03:00"),
    endTime: new Date("2026-09-16T15:30:00-03:00"),
    category: "arena-2",
  },
  {
    title: "Comanda Aberta",
    description:
      "Comanda Aberta.",
    speaker: null,
    locationName: "Arena 2 - Sebrae",
    locationMapX: 0.2596,
    locationMapY: 0.7866,
    startTime: new Date("2026-09-16T16:00:00-03:00"),
    endTime: new Date("2026-09-16T17:15:00-03:00"),
    category: "arena-2",
  },
  {
    title: "Super El Niño e mudanças climáticas: oportunidades e riscos para negócios de alimentação fora do lar",
    description:
      "Super El Niño e mudanças climáticas: oportunidades e riscos para negócios de alimentação fora do lar. Com Gustavo Bentes, Beatriz Proença.",
    speaker: "Gustavo Bentes, Beatriz Proença",
    locationName: "Arena 2 - Sebrae",
    locationMapX: 0.2596,
    locationMapY: 0.7866,
    startTime: new Date("2026-09-16T17:30:00-03:00"),
    endTime: new Date("2026-09-16T18:30:00-03:00"),
    category: "arena-2",
  },
];

async function main() {
  console.log("Seeding banco com a programação oficial do Salão Abrasel...");

  for (const event of SCHEDULE_EVENTS) {
    await prisma.event.create({ data: event });
  }

  console.log(`${SCHEDULE_EVENTS.length} eventos criados.`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
