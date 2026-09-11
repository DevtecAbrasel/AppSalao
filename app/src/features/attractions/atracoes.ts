import { IconName } from "../../components/Icon";
import { colors } from "../../constants/theme";

/**
 * As atrações do salão — o que existe no evento além das palestras e das
 * arenas: espaços para visitar, experimentar e conversar.
 *
 * Conteúdo do evento, então mora em dados e não escrito dentro da tela: quem
 * for atualizar de uma edição para a outra acrescenta um item aqui sem
 * encostar no layout.
 *
 * Só entra aqui o que está confirmado. Os dois primeiros vieram do material
 * da organização; `poiKey` casa com `pointsOfInterest.ts`, e é o que permite
 * levar a pessoa até o lugar no mapa.
 */
export interface Atracao {
  key: string;
  nome: string;
  descricao: string;
  /** Onde acontece, em palavras. */
  local: string;
  /** Ponto correspondente em `pointsOfInterest.ts`, quando a atração tem um. */
  poiKey?: string;
  datas: string;
  horario: string;
  icone: IconName;
  /** Cor de acento da faixa do topo — dá identidade a cada cartão. */
  acento: string;
  /**
   * Tela própria que o cartão abre. Sem ela, o cartão leva ao mapa (é o que
   * temos de concreto a oferecer sobre o lugar).
   *
   * Quando a organização mandar as fotos das atrações, elas entram como um
   * campo `imagem` aqui e substituem a faixa gráfica — o cartão não muda.
   */
  tela?: "Consultorias";
}

export const ATRACOES: Atracao[] = [
  {
    key: "restaurante-do-futuro",
    nome: "Restaurante do Futuro · Cozinha 4.0",
    descricao:
      "Um espaço interativo com demonstrações, tecnologias e soluções que estão transformando a cozinha profissional.",
    local: "Área de Exposição",
    poiKey: "cozinha-futuro",
    datas: "15 e 16 de setembro",
    horario: "Das 10h às 18h",
    icone: "restaurant",
    acento: colors.laranja,
  },
  {
    key: "consultorias",
    nome: "Orientação com especialistas",
    descricao:
      "Leve uma dúvida real do seu negócio e converse com profissionais parceiros sobre gestão, finanças, marketing, jurídico e mais. Atendimento individual, agendado pelo WhatsApp.",
    local: "Estande da Abrasel",
    poiKey: "estande-abrasel",
    datas: "15 e 16 de setembro",
    horario: "Das 10h às 18h",
    icone: "chat",
    acento: colors.rosa,
    tela: "Consultorias",
  },
];
