// Estandes/ativações voltados ao público que não têm palestra com horário
// marcado (por isso não vêm da tabela de eventos) — só um pin informativo
// com o nome do local. Coordenadas NORMALIZADAS (0..1) sobre a planta real
// (app/assets/planta-salao.png) — por serem normalizadas, continuam valendo
// mesmo quando a resolução do arquivo muda, desde que o RECORTE seja o mesmo.
//
// Observação: não encontramos "Mesa de Compradores" nem "Área VIP" com
// rótulo nessa planta (a documentação do estande cita que a Mesa de
// Compradores mudou de lugar) — ficaram de fora até termos a localização
// confirmada.
export interface PointOfInterest {
  key: string;
  label: string;
  /** Código de 2 letras exibido dentro do pin — precisa ser único entre todos os pontos. */
  marker: string;
  x: number;
  y: number;
}

export const POINTS_OF_INTEREST: PointOfInterest[] = [
  { key: "estande-abrasel", label: "Estande Abrasel", marker: "AB", x: 0.1472, y: 0.6732 },
  { key: "sebrae", label: "Sebrae", marker: "SB", x: 0.1923, y: 0.6732 },
  { key: "ambev-estande", label: "Estande Ambev", marker: "AM", x: 0.3277, y: 0.789 },
  { key: "cozinha-futuro", label: "Cozinha/Restaurante do Futuro", marker: "CF", x: 0.1574, y: 0.911 },
  { key: "99food", label: "99Food", marker: "99", x: 0.2451, y: 0.9024 },
  { key: "google-samsung", label: "Google / Samsung", marker: "GS", x: 0.8298, y: 0.6622 },
  { key: "stone", label: "Stone", marker: "ST", x: 0.6936, y: 0.8963 },
  { key: "ifood", label: "iFood", marker: "IF", x: 0.883, y: 0.9085 },
  { key: "meeting-point", label: "Meeting Point", marker: "MP", x: 0.634, y: 0.7073 },
];
