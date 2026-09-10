// Estandes/ativações voltados ao público que não têm palestra com horário
// marcado (por isso não vêm da tabela de eventos) — só um pin informativo
// com o nome do local.
//
// Coordenadas NORMALIZADAS (0..1) medidas sobre a planta HORIZONTAL
// (app/assets/planta-salao-h.png). Por serem normalizadas, continuam valendo
// se a resolução do arquivo mudar, desde que o RECORTE seja o mesmo. A versão
// vertical é derivada por rotação em `planta.ts` — não meça de novo lá.
//
// Refeitas para a planta de 2026 (Mapa-MAP-01): os nove pontos existem também
// no desenho novo, mas todos mudaram de lugar em relação à planta anterior.
export interface PointOfInterest {
  key: string;
  label: string;
  /** Código de 2 letras exibido dentro do pin — precisa ser único entre todos os pontos. */
  marker: string;
  x: number;
  y: number;
}

export const POINTS_OF_INTEREST: PointOfInterest[] = [
  { key: "estande-abrasel", label: "Estande Abrasel", marker: "AB", x: 0.873, y: 0.461 },
  { key: "sebrae", label: "Sebrae", marker: "SB", x: 0.132, y: 0.177 },
  { key: "ambev-estande", label: "Estande Ambev", marker: "AM", x: 0.303, y: 0.479 },
  { key: "cozinha-futuro", label: "Cozinha/Restaurante do Futuro", marker: "CF", x: 0.072, y: 0.774 },
  { key: "99food", label: "99Food", marker: "99", x: 0.196, y: 0.765 },
  { key: "google-samsung", label: "Google / Samsung", marker: "GS", x: 0.924, y: 0.16 },
  { key: "stone", label: "Stone", marker: "ST", x: 0.752, y: 0.767 },
  { key: "ifood", label: "iFood", marker: "IF", x: 0.949, y: 0.767 },
  { key: "meeting-point", label: "Meeting Point", marker: "MP", x: 0.659, y: 0.29 },
];
