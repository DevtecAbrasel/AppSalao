import { IconName } from "../../components/Icon";
import { colors } from "../../constants/theme";

/**
 * As atrações do salão — o que existe no evento além das palestras e das
 * arenas: espaços para visitar, experimentar e conversar.
 *
 * Conteúdo do evento, então mora em dados e não escrito dentro da tela. As
 * duas telas de atrações (a lista e o detalhe) são as MESMAS para qualquer
 * atração: quem for atualizar de uma edição para a outra acrescenta um item
 * aqui e ganha cartão e página sem encostar no layout.
 *
 * Nada disso vem da API de propósito. É texto fixo de uma edição do evento,
 * não dado que mude sozinho — publicar junto com o app evita um endpoint, uma
 * migração e uma tela de carregando para exibir o que já sabemos.
 */

/** Um item da lista de temas do detalhe. */
export interface TemaAtracao {
  key: string;
  nome: string;
  icone: IconName;
}

/** A ação principal do detalhe — sempre um link externo. */
export interface AcaoAtracao {
  rotulo: string;
  url: string;
  icone: IconName;
  /** Mostrado se o link não abrir (sem WhatsApp, navegador bloqueando…). */
  ajudaSeFalhar: string;
}

export interface Atracao {
  key: string;
  /** Nome curto, usado no cartão da lista e no cabeçalho do detalhe. */
  nome: string;
  /** Segunda linha do herói — o sub-nome da atração, quando existe. */
  subtitulo?: string;
  /** Uma frase no cartão: o que é, para quem passa os olhos na lista. */
  resumo: string;
  /** A chamada do herói, no detalhe. */
  chamada: string;
  /** Corpo do detalhe. */
  paragrafos: string[];
  /** As condições em uma palavra cada — ficam logo abaixo do herói. */
  selos?: string[];
  temas?: { titulo: string; itens: TemaAtracao[] };
  acao: AcaoAtracao;
  /**
   * Onde acontece. Duas formas porque os dois lugares têm larguras muito
   * diferentes: no cartão a linha divide o espaço com a pílula "Saiba mais",
   * e a frase inteira empurraria a pílula para baixo.
   */
  local: string;
  onde: string;
  /** Ponto correspondente em `pointsOfInterest.ts` — é o que o "Ver no mapa" foca. */
  poiKey?: string;
  datas: string;
  horario: string;
  /** Ressalva do final da página. */
  nota?: string;
  icone: IconName;
  /**
   * Cor de acento da faixa do topo — dá identidade a cada cartão. Quando a
   * organização mandar as fotos, elas entram no lugar da faixa e o resto do
   * cartão fica igual.
   */
  acento: string;
}

export const ATRACOES: Atracao[] = [
  {
    key: "consultorias",
    nome: "Consultorias com especialistas",
    resumo:
      "Plantões de atendimento individual com profissionais parceiros, para levar uma dúvida real do seu negócio.",
    chamada:
      "Aproveite o Salão Abrasel para tirar dúvidas do seu negócio direto com especialistas!",
    paragrafos: [
      "Durante o evento, teremos plantões de atendimento individual no estande da Abrasel, com profissionais parceiros preparados para conversar sobre desafios reais da sua operação.",
      "É uma oportunidade para levar uma dúvida, problema ou desafio específico do seu negócio e receber uma orientação inicial de quem entende do assunto.",
    ],
    // As três condições do atendimento em uma palavra cada. Dizem o mesmo que
    // "os atendimentos serão agendados, individuais e com duração de até 20
    // minutos", só que de um jeito que se lê de relance — escrever a frase
    // inteira logo abaixo seria repetir a informação duas vezes seguidas.
    selos: ["Agendado", "Individual", "Até 20 minutos"],
    temas: {
      titulo: "Temas disponíveis",
      // Os três temas jurídicos dividem o mesmo ícone de propósito: são a
      // mesma família, e o que os separa é a especialidade escrita ao lado.
      // Dar três desenhos diferentes sugeriria uma distinção que não existe.
      itens: [
        { key: "marketing", nome: "Marketing", icone: "campaign" },
        { key: "juridico-trabalhista", nome: "Jurídico trabalhista", icone: "gavel" },
        { key: "juridico-tributario", nome: "Jurídico tributário", icone: "gavel" },
        {
          key: "juridico-operacional",
          nome: "Jurídico operacional e regulatório",
          icone: "gavel",
        },
        {
          key: "alimentos",
          nome: "Segurança dos alimentos e nutrição",
          icone: "restaurant",
        },
        { key: "equipes", nome: "Gestão de equipes", icone: "group" },
        { key: "financeira", nome: "Gestão financeira e compras", icone: "payments" },
      ],
    },
    acao: {
      rotulo: "Agende seu horário",
      url: "https://wa.link/t0hj7h",
      icone: "chat",
      ajudaSeFalhar:
        "Tente novamente ou procure o estande da Abrasel para agendar pessoalmente.",
    },
    local: "Estande da Abrasel",
    onde: "Estande da Abrasel, no Salão Abrasel",
    poiKey: "estande-abrasel",
    datas: "15 e 16 de setembro",
    horario: "Das 10h às 18h",
    nota: "As vagas são limitadas e preenchidas conforme disponibilidade.",
    icone: "chat",
    acento: colors.rosa,
  },
  {
    key: "restaurante-do-futuro",
    nome: "Restaurante do Futuro",
    subtitulo: "Cozinha 4.0",
    resumo:
      "Um espaço interativo com demonstrações, tecnologias e soluções que estão transformando a cozinha profissional.",
    chamada:
      "Faça o seu pré-cadastro e tenha prioridade para conhecer o Restaurante do Futuro - Cozinha 4.0",
    paragrafos: [
      "Um espaço interativo com demonstrações, tecnologias e soluções que estão transformando a cozinha profissional.",
    ],
    acao: {
      rotulo: "Pré-cadastro Cozinha 4.0",
      url: "https://restaurantedofuturo.salaoabrasel.com.br/",
      icone: "open-in-new",
      ajudaSeFalhar:
        "Abra restaurantedofuturo.salaoabrasel.com.br no navegador do seu celular.",
    },
    local: "Área de Exposição",
    onde: "Área de Exposição, no Salão Abrasel",
    poiKey: "cozinha-futuro",
    datas: "15 e 16 de setembro",
    horario: "Das 10h às 18h",
    icone: "restaurant",
    acento: colors.laranja,
  },
];

export function acharAtracao(key: string): Atracao | undefined {
  return ATRACOES.find((a) => a.key === key);
}
