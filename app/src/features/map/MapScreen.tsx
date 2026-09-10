import { useEffect, useMemo, useRef, useState } from "react";
import { Image, LayoutChangeEvent, Pressable, StyleSheet, Text, View } from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, radius, spacing } from "../../constants/theme";
import { EmptyState, ErrorState, LoadingState } from "../../components/StateView";
import { MapStackParamList } from "../../navigation/types";
import { EventItem, EventStatus } from "../../types";
import { getEventStatus } from "../../lib/dateTime";
import { useEventsStore } from "../events/store";
import { useFavoritesStore } from "../favorites/store";
import { PlantaPin } from "./PlantaPin";
import { EventPreviewCard } from "./EventPreviewCard";
import { PlacePreviewCard } from "./PlacePreviewCard";
import { Minimap } from "./Minimap";
import { POINTS_OF_INTEREST } from "./pointsOfInterest";
import { acharExpositor, temLocalizacao } from "../exhibitors/expositores";
import {
  computeFitScale,
  coordenadaDoEvento,
  enquadrarRegiao,
  ModoMapa,
  PLANTA,
  REGIOES,
} from "./planta";
import { ZoomPan, ZoomPanHandle } from "./ZoomPan";
import { computeCoverScale, Point } from "./zoomMath";

type Props = NativeStackScreenProps<MapStackParamList, "MapView">;

// A planta é sempre renderizada dentro do ZoomPan no tamanho NATIVO do
// arquivo (nunca no tamanho, menor, da viewport) e depois ESCALADA PRA BAIXO
// pra caber na tela. Isso é o oposto de renderizar do tamanho da viewport e
// escalar pra CIMA ao dar zoom — era isso que causava o borrão ao ampliar.
//
// Os dois arquivos e a conversão de coordenadas entre eles moram em
// `planta.ts`; aqui só se escolhe qual usar.
//
// Quanto além do "cobrir a tela" (zoom mínimo) o usuário pode ampliar.
const MAX_ZOOM_MULTIPLIER = 4;

const STATUS_COLOR: Record<EventStatus, string> = {
  upcoming: colors.marinho,
  live: colors.live,
  ended: colors.ended,
};

// Pins informativos (estandes/ativações sem horário marcado) usam uma cor
// fixa, diferente da paleta de status das palestras — deixa claro que são
// dois tipos de pin diferentes.
const POI_COLOR = colors.secondary;

interface RoomPin {
  key: string;
  locationName: string;
  x: number;
  y: number;
  activeEvent: EventItem;
}

type Selection =
  | { kind: "event"; key: string }
  | { kind: "poi"; key: string }
  | { kind: "expositor"; key: string }
  | null;

// Quanto aproximar ao chegar pela lista de expositores, em múltiplos da
// escala "cover". Um stand ocupa poucos centímetros da planta: no máximo do
// zoom só se vê o logo dele, sem rua nem vizinho, e quem chegou ali
// justamente quer saber ONDE aquilo fica. Este valor deixa o stand grande e
// ainda mostra o que está em volta.
const ZOOM_DO_EXPOSITOR = 1.8;

// Dois pinos no mesmo ponto viram um borrão. Quando o expositor destacado
// coincide com um ponto de interesse já existente (Ambev, Stone, iFood...),
// o pino permanente cede a vez ao destaque.
const DISTANCIA_MESMO_PONTO = 0.012;

// Marcador curto exibido dentro do pin: usa o número da arena/sala quando
// existe (ex: "Arena 1 - Keeta" -> "1"), senão a primeira letra do nome.
function shortMarkerLabel(locationName: string): string {
  const match = locationName.match(/\d+/);
  return match ? match[0] : locationName.slice(0, 1).toUpperCase();
}

// Cada "sala" vira um pin. Quando mais de um evento acontece na mesma sala,
// mostramos o que está ao vivo agora ou, se nenhum, o próximo a começar.
function pickRoomPins(events: EventItem[]): RoomPin[] {
  // A posição pode vir da planta (arenas) ou do próprio evento — quem decide
  // é `coordenadaDoEvento`; aqui só descartamos quem não tem nenhuma das duas.
  const withCoords = events.filter((e) => coordenadaDoEvento(e) !== null);
  const byLocation = new Map<string, EventItem[]>();

  for (const event of withCoords) {
    const list = byLocation.get(event.locationName) ?? [];
    list.push(event);
    byLocation.set(event.locationName, list);
  }

  const pins: RoomPin[] = [];
  for (const [locationName, roomEvents] of byLocation) {
    const now = new Date();
    const live = roomEvents.find((e) => getEventStatus(e, now) === "live");
    const nextUpcoming = roomEvents
      .filter((e) => getEventStatus(e, now) === "upcoming")
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
    const mostRecentEnded = roomEvents
      .filter((e) => getEventStatus(e, now) === "ended")
      .sort((a, b) => new Date(b.startTime).getTime() - new Date(a.startTime).getTime())[0];

    const activeEvent = live ?? nextUpcoming ?? mostRecentEnded;
    if (!activeEvent) continue;

    const ponto = coordenadaDoEvento(activeEvent);
    if (!ponto) continue;

    pins.push({
      key: locationName,
      locationName,
      x: ponto.x,
      y: ponto.y,
      activeEvent,
    });
  }

  return pins;
}

export function MapScreen({ route, navigation }: Props) {
  const { events, status, error, load } = useEventsStore();
  const { favorites, load: loadFavorites, status: favoritesStatus } = useFavoritesStore();
  const [selection, setSelection] = useState<Selection>(null);
  // A viewport ocupa a tela toda (style `mapViewport` com `flex: 1`) e pode
  // ter uma proporção bem diferente da planta — o mapa nunca é encolhido
  // pra caber inteiro (isso é o que fazia virar uma faixinha minúscula no
  // celular); em vez disso ele sempre COBRE a viewport (como um `object-fit:
  // cover`), cortando o que sobrar, e o usuário navega com pan/zoom.
  const [viewport, setViewport] = useState<{ width: number; height: number } | null>(null);
  const [liveView, setLiveView] = useState<{ scale: number; center: Point } | null>(null);
  const hasCenteredRef = useRef(false);

  // Começa em "tela cheia" porque é o enquadramento em que a planta preenche
  // a tela e os nomes já saem legíveis; quem quiser se situar no salão troca
  // para a visão com atalhos pelo botão.
  const [modo, setModo] = useState<ModoMapa>("classico");

  const zoomPanRef = useRef<ZoomPanHandle>(null);

  const PLANTA_IMAGE = PLANTA.image;
  const PLANTA_NATIVE_WIDTH = PLANTA.width;
  const PLANTA_NATIVE_HEIGHT = PLANTA.height;

  const content = { width: PLANTA_NATIVE_WIDTH, height: PLANTA_NATIVE_HEIGHT };

  // "cover" = a planta cobre a viewport inteira; "fit" = a planta inteira cabe
  // na viewport. Numa tela de celular em pé os dois estão MUITO longe um do
  // outro (a planta é 3,6:1 e a tela ~0,55:1), e é justamente essa distância
  // que decide se o usuário consegue ou não ver o conjunto.
  const coverScale = viewport ? computeCoverScale(viewport, content) : 1;
  const fitScale = viewport ? computeFitScale(viewport, content) : 1;

  // No modo clássico o mínimo é "cover": nunca aparece fundo vazio, mas
  // também nunca dá para afastar o suficiente para ver a planta toda. No modo
  // portrait o mínimo é "fit" — aceita-se a margem vazia em troca de existir
  // uma visão geral de verdade.
  const minScale = modo === "portrait" ? fitScale : coverScale;
  const maxScale = coverScale * MAX_ZOOM_MULTIPLIER;

  // O portrait abre na escala "cover", igual ao clássico — e isso é
  // deliberado. Abrir mais afastado mostrava mais planta, mas deixava 41% da
  // tela como fundo vazio, e dois dedos apoiados nessa faixa pinçam sobre
  // nada. A visão geral continua disponível (atalho "Tudo" e zoom para fora);
  // ela deixou de ser o estado inicial.
  const escalaDeAbertura = coverScale;

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport({ width, height });
  };

  useEffect(() => {
    load();
    loadFavorites();
  }, [load, loadFavorites]);

  const pins = useMemo(() => pickRoomPins(events), [events]);

  // Palestra favoritada mais relevante agora: a que já começou (se houver)
  // ou, senão, a próxima a começar — é nela que focamos o mapa ao abrir a
  // tela, pra já mostrar de cara a arena/estande de quem o usuário marcou.
  const nextFavoriteEvent = useMemo(() => {
    const now = new Date();
    const withCoords = favorites.filter((e) => coordenadaDoEvento(e) !== null);
    const live = withCoords.find((e) => getEventStatus(e, now) === "live");
    if (live) return live;

    return withCoords
      .filter((e) => getEventStatus(e, now) === "upcoming")
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
  }, [favorites]);

  const focusEventId = route.params?.focusEventId;
  const focusExpositorKey = route.params?.focusExpositorKey;
  const focusPoiKey = route.params?.focusPoiKey;

  // Mesmo caminho do expositor, para um ponto de interesse já existente — é
  // assim que a tela de Consultorias mostra onde fica o estande da Abrasel.
  useEffect(() => {
    if (!focusPoiKey || !viewport) return;
    const poi = POINTS_OF_INTEREST.find((p) => p.key === focusPoiKey);
    if (!poi) return;

    hasCenteredRef.current = true;
    setSelection({ kind: "poi", key: poi.key });
    zoomPanRef.current?.centerOn(
      poi.x * PLANTA_NATIVE_WIDTH,
      poi.y * PLANTA_NATIVE_HEIGHT,
      Math.min(maxScale, coverScale * ZOOM_DO_EXPOSITOR)
    );
  }, [focusPoiKey, viewport, coverScale, maxScale, PLANTA_NATIVE_WIDTH, PLANTA_NATIVE_HEIGHT]);

  // Chegou pela lista de expositores: enquadra o stand e o deixa selecionado,
  // com o cartão mostrando o nome. Depois disso o mapa é o mapa de sempre —
  // este efeito só decide o PRIMEIRO enquadramento e não trava mais nada, por
  // isso zoom, pinça e arraste seguem livres.
  useEffect(() => {
    if (!focusExpositorKey || !viewport) return;
    const expositor = acharExpositor(focusExpositorKey);
    if (!expositor || !temLocalizacao(expositor)) return;

    hasCenteredRef.current = true;
    setSelection({ kind: "expositor", key: expositor.key });
    zoomPanRef.current?.centerOn(
      expositor.x * PLANTA_NATIVE_WIDTH,
      expositor.y * PLANTA_NATIVE_HEIGHT,
      Math.min(maxScale, coverScale * ZOOM_DO_EXPOSITOR)
    );
  }, [
    focusExpositorKey,
    viewport,
    coverScale,
    maxScale,
    PLANTA_NATIVE_WIDTH,
    PLANTA_NATIVE_HEIGHT,
  ]);

  // Trocar de modo muda os limites de zoom: o enquadramento anterior pode nem
  // ser mais alcançável. Liberar o "já centralizou" faz reenquadrar do zero.
  useEffect(() => {
    hasCenteredRef.current = false;
  }, [modo]);

  // Enquadramento inicial. Se não veio um foco explícito (navegação a partir
  // do detalhe de um evento), centraliza na próxima palestra favoritada; sem
  // favoritos, no modo clássico centraliza a planta inteira e no portrait abre
  // pela ENTRADA — que é por onde a pessoa chega e o ponto de referência que
  // ela tem no corpo quando pega o celular no salão.
  useEffect(() => {
    if (!viewport || hasCenteredRef.current || focusEventId || focusExpositorKey || focusPoiKey)
      return;
    if (favoritesStatus === "loading") return; // espera decidir com a lista certa

    hasCenteredRef.current = true;

    const alvo = nextFavoriteEvent && coordenadaDoEvento(nextFavoriteEvent);
    if (nextFavoriteEvent && alvo) {
      const pin = pins.find((p) => p.locationName === nextFavoriteEvent.locationName);
      if (pin) setSelection({ kind: "event", key: pin.key });

      zoomPanRef.current?.centerOn(
        alvo.x * PLANTA_NATIVE_WIDTH,
        alvo.y * PLANTA_NATIVE_HEIGHT,
        escalaDeAbertura
      );
    } else if (modo === "portrait") {
      const entrada = REGIOES.find((r) => r.key === "entrada") ?? REGIOES[0];
      const { center, scale } = enquadrarRegiao(entrada, viewport, content, minScale, maxScale);
      zoomPanRef.current?.centerOn(center.x, center.y, scale);
    } else {
      zoomPanRef.current?.centerOn(
        PLANTA_NATIVE_WIDTH / 2,
        PLANTA_NATIVE_HEIGHT / 2,
        escalaDeAbertura
      );
    }
  }, [
    viewport,
    escalaDeAbertura,
    minScale,
    maxScale,
    focusEventId,
    favoritesStatus,
    nextFavoriteEvent,
    pins,
    modo,
    content,
    PLANTA_NATIVE_WIDTH,
    PLANTA_NATIVE_HEIGHT,
  ]);

  useEffect(() => {
    if (!focusEventId || pins.length === 0 || !viewport) return;

    const pin = pins.find((p) => p.activeEvent.id === focusEventId);
    if (pin) {
      hasCenteredRef.current = true;
      setSelection({ kind: "event", key: pin.key });
      zoomPanRef.current?.centerOn(
        pin.x * PLANTA_NATIVE_WIDTH,
        pin.y * PLANTA_NATIVE_HEIGHT,
        escalaDeAbertura
      );
    }
  }, [focusEventId, pins, viewport, escalaDeAbertura, PLANTA_NATIVE_WIDTH, PLANTA_NATIVE_HEIGHT]);

  if (status === "loading" && events.length === 0) {
    return <LoadingState label="Carregando mapa..." />;
  }

  if (status === "error" && events.length === 0) {
    return <ErrorState message={error ?? "Erro desconhecido"} onRetry={load} />;
  }

  if (pins.length === 0 && POINTS_OF_INTEREST.length === 0) {
    return <EmptyState message="Nenhum evento com localização cadastrada no mapa ainda." />;
  }

  const selectedPin =
    selection?.kind === "event" ? pins.find((p) => p.key === selection.key) : undefined;
  const selectedPoi =
    selection?.kind === "poi" ? POINTS_OF_INTEREST.find((p) => p.key === selection.key) : undefined;
  const selectedExpositor =
    selection?.kind === "expositor" ? acharExpositor(selection.key) : undefined;

  // Só o expositor que chegou pela lista ganha pino no mapa. Marcar os 49 de
  // uma vez cobriria a planta de bolinhas e esconderia o desenho que eles
  // deveriam ajudar a ler — o pino aqui é um destaque momentâneo, não uma
  // camada permanente.
  const expositorDestacado =
    selectedExpositor && temLocalizacao(selectedExpositor) ? selectedExpositor : undefined;

  const poisVisiveis = expositorDestacado
    ? POINTS_OF_INTEREST.filter(
        (poi) =>
          Math.abs(poi.x - (expositorDestacado.x as number)) > DISTANCIA_MESMO_PONTO ||
          Math.abs(poi.y - (expositorDestacado.y as number)) > DISTANCIA_MESMO_PONTO
      )
    : POINTS_OF_INTEREST;

  // Pinos somem na visão geral: a essa distância eles viram um amontoado que
  // esconde o próprio desenho, e nenhum deles é legível de qualquer forma.
  const mostrarPinos = modo !== "portrait" || !liveView || liveView.scale > fitScale * 1.6;

  const irParaRegiao = (key: string) => {
    if (!viewport) return;
    const regiao = REGIOES.find((r) => r.key === key);
    if (!regiao) return;
    const { center, scale } = enquadrarRegiao(regiao, viewport, content, minScale, maxScale);
    setSelection(null);
    zoomPanRef.current?.centerOn(center.x, center.y, scale);
  };

  return (
    <View style={styles.container}>
      {/* flex: 1 faz o mapa ocupar a tela toda (e não uma faixinha no meio,
          que é o que dava com aspectRatio fixo numa tela alta e estreita).
          A planta tem outra proporção — a `coverScale` calculada acima cuida
          de preencher a viewport sem nunca deixar espaço vazio sobrando. */}
      <View style={styles.mapViewport} onLayout={handleLayout}>
        {viewport && (
          <ZoomPan
            ref={zoomPanRef}
            viewportWidth={viewport.width}
            viewportHeight={viewport.height}
            contentWidth={PLANTA_NATIVE_WIDTH}
            contentHeight={PLANTA_NATIVE_HEIGHT}
            minScale={minScale}
            maxScale={maxScale}
            onViewportChange={setLiveView}
          >
            <View style={{ width: PLANTA_NATIVE_WIDTH, height: PLANTA_NATIVE_HEIGHT }}>
              <Image
                source={PLANTA_IMAGE}
                style={styles.plantaImage}
                resizeMode="contain"
                accessibilityLabel="Planta do Salão Abrasel"
              />
              {/* O tamanho do pino compensa a escala atual para ele ficar
                  constante na tela. No modo portrait a escala varia muito
                  mais (de "planta inteira" até 4x), então usar a escala VIVA
                  em vez da de abertura é o que impede o pino de virar um
                  borrão gigante na visão geral. */}
              {mostrarPinos &&
                pins.map((pin) => (
                  <PlantaPin
                    key={`event-${pin.key}`}
                    x={pin.x}
                    y={pin.y}
                    color={STATUS_COLOR[getEventStatus(pin.activeEvent)]}
                    highlighted={selection?.kind === "event" && selection.key === pin.key}
                    label={shortMarkerLabel(pin.locationName)}
                    sizeMultiplier={1 / (liveView?.scale ?? coverScale)}
                    onPress={() => setSelection({ kind: "event", key: pin.key })}
                  />
                ))}
              {mostrarPinos &&
                poisVisiveis.map((poi) => (
                  <PlantaPin
                    key={`poi-${poi.key}`}
                    x={poi.x}
                    y={poi.y}
                    color={POI_COLOR}
                    highlighted={selection?.kind === "poi" && selection.key === poi.key}
                    label={poi.marker}
                    sizeMultiplier={1 / (liveView?.scale ?? coverScale)}
                    onPress={() => setSelection({ kind: "poi", key: poi.key })}
                  />
                ))}
              {expositorDestacado && (
                <PlantaPin
                  key={`expositor-${expositorDestacado.key}`}
                  x={expositorDestacado.x as number}
                  y={expositorDestacado.y as number}
                  color={colors.primary}
                  highlighted
                  label={expositorDestacado.nome.slice(0, 2).toUpperCase()}
                  sizeMultiplier={1 / (liveView?.scale ?? coverScale)}
                  onPress={() =>
                    setSelection({ kind: "expositor", key: expositorDestacado.key })
                  }
                />
              )}
            </View>
          </ZoomPan>
        )}

        {viewport && liveView && (
          <View style={styles.minimapContainer}>
            <Minimap
              imageSource={PLANTA_IMAGE}
              contentWidth={PLANTA_NATIVE_WIDTH}
              contentHeight={PLANTA_NATIVE_HEIGHT}
              viewportWidth={viewport.width}
              viewportHeight={viewport.height}
              scale={liveView.scale}
              center={liveView.center}
              onRecenter={(x, y) => zoomPanRef.current?.centerOn(x, y, liveView.scale)}
            />
          </View>
        )}

        {/* Alterna entre os dois enquadramentos. O rótulo nomeia o que a
            pessoa VAI VER ao tocar, e não o modo em que ela está — é a
            pergunta que alguém de pé no salão realmente faz ("cadê a planta
            inteira?"), em vez de um nome interno de configuração. */}
        <Pressable
          style={styles.visaoBotao}
          onPress={() => setModo((m) => (m === "classico" ? "portrait" : "classico"))}
          accessibilityRole="button"
          accessibilityLabel={
            modo === "classico"
              ? "Ver a planta inteira, com atalhos para as regiões"
              : "Voltar para a planta em tela cheia"
          }
        >
          <Text style={styles.visaoTexto}>
            {modo === "classico" ? "Ver planta inteira" : "Tela cheia"}
          </Text>
        </Pressable>

        <View style={[styles.zoomControls, modo === "portrait" && styles.zoomControlsPortrait]}>
          <Pressable
            style={styles.zoomButton}
            onPress={() => zoomPanRef.current?.zoomIn()}
            hitSlop={6}
          >
            <Text style={styles.zoomButtonText}>+</Text>
          </Pressable>
          <Pressable
            style={styles.zoomButton}
            onPress={() => zoomPanRef.current?.zoomOut()}
            hitSlop={6}
          >
            <Text style={styles.zoomButtonText}>–</Text>
          </Pressable>
        </View>

        {/* Atalhos de região: é o que transforma a planta em algo consultável
            de pé no salão. Sem eles, achar a Arena Sebrae numa planta 3,6:1 é
            arrastar às cegas até topar com ela.

            Sobrepostos, e não empilhados abaixo do mapa, de propósito: como
            faixa própria eles encurtavam a área do mapa só neste modo, e a
            viewport medida ficava diferente entre os dois — o que deslocava a
            escala "cover" e fazia o modo clássico abrir levemente fora do
            lugar ao voltar. Sobrepondo, a área do mapa é a mesma sempre. */}
        {modo === "portrait" && (
          <View style={styles.regioes} pointerEvents="box-none">
            {REGIOES.map((regiao) => (
              <Pressable
                key={regiao.key}
                style={styles.regiaoChip}
                onPress={() => irParaRegiao(regiao.key)}
                accessibilityRole="button"
                accessibilityLabel={`Ir para ${regiao.label}`}
              >
                <Text style={styles.regiaoChipTexto}>{regiao.label}</Text>
              </Pressable>
            ))}
          </View>
        )}
      </View>

      {selectedPin && (
        <EventPreviewCard
          event={selectedPin.activeEvent}
          onClose={() => setSelection(null)}
          onPress={() =>
            navigation.navigate("EventDetail", { eventId: selectedPin.activeEvent.id })
          }
        />
      )}
      {selectedExpositor && (
        <PlacePreviewCard
          label={selectedExpositor.nome}
          eyebrow={temLocalizacao(selectedExpositor) ? "Você está vendo" : "Expositor"}
          onClose={() => setSelection(null)}
        />
      )}
      {selectedPoi && (
        <PlacePreviewCard label={selectedPoi.label} onClose={() => setSelection(null)} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  mapViewport: {
    flex: 1,
    width: "100%",
    overflow: "hidden",
  },
  plantaImage: {
    width: "100%",
    height: "100%",
  },
  // Canto oposto aos botões de zoom, pra não atrapalhar nem um nem outro.
  minimapContainer: {
    position: "absolute",
    left: spacing.sm,
    top: spacing.sm,
  },
  visaoBotao: {
    position: "absolute",
    right: spacing.sm,
    top: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    backgroundColor: colors.marinho,
    shadowColor: "#000",
    shadowOpacity: 0.18,
    shadowRadius: 5,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
  },
  visaoTexto: {
    color: colors.textOnDark,
    fontSize: 13,
    fontWeight: "700",
  },
  // Camada sobreposta ao mapa. `pointerEvents="box-none"` no container deixa
  // o arraste passar pelos vãos entre os chips e chegar no mapa; só os chips
  // em si capturam o toque.
  regioes: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
  },
  regiaoChip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs + 2,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  regiaoChipTexto: {
    fontSize: 13,
    fontWeight: "600",
    color: colors.text,
  },
  zoomControls: {
    position: "absolute",
    right: spacing.sm,
    bottom: spacing.sm,
    gap: spacing.xs,
  },
  // Sobe acima da faixa de atalhos para os dois não se cobrirem.
  zoomControlsPortrait: {
    bottom: spacing.sm + 48,
  },
  zoomButton: {
    width: 36,
    height: 36,
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 },
    elevation: 3,
  },
  zoomButtonText: {
    fontSize: 20,
    fontWeight: "700",
    color: colors.marinho,
    lineHeight: 22,
  },
});
