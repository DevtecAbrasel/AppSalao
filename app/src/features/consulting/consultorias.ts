import { IconName } from "../../components/Icon";

/**
 * Conteúdo do plantão de consultorias no estande da Abrasel.
 *
 * Fica em dados, e não escrito dentro da tela, porque é conteúdo do evento:
 * a lista de temas muda de uma edição para a outra, e quem for atualizar
 * mexe aqui sem entrar no layout.
 *
 * Nesta primeira versão o agendamento é o WhatsApp da organização — não há
 * banco, formulário nem controle de horários no app.
 */
export const LINK_AGENDAMENTO = "https://wa.link/t0hj7h";

/** Onde o atendimento acontece — casa com o ponto de interesse do mapa. */
export const LOCAL_ATENDIMENTO = {
  descricao: "Estande da Abrasel, no Salão Abrasel",
  /** Chave em `pointsOfInterest.ts`; é o que o botão "Ver no mapa" foca. */
  poiKey: "estande-abrasel",
};

export interface TemaConsultoria {
  key: string;
  nome: string;
  icone: IconName;
}

// Os três temas jurídicos dividem o mesmo ícone de propósito: são a mesma
// família, e o que os separa é a especialidade escrita ao lado. Dar três
// desenhos diferentes sugeriria uma distinção que não existe.
export const TEMAS: TemaConsultoria[] = [
  { key: "marketing", nome: "Marketing", icone: "campaign" },
  { key: "juridico-trabalhista", nome: "Jurídico trabalhista", icone: "gavel" },
  { key: "juridico-tributario", nome: "Jurídico tributário", icone: "gavel" },
  { key: "juridico-operacional", nome: "Jurídico operacional e regulatório", icone: "gavel" },
  { key: "alimentos", nome: "Segurança dos alimentos e nutrição", icone: "restaurant" },
  { key: "equipes", nome: "Gestão de equipes", icone: "group" },
  { key: "financeira", nome: "Gestão financeira e compras", icone: "payments" },
];
