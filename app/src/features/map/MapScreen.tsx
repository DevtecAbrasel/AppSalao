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
import {
  coordenadaDoEvento,
  OrientacaoPlanta,
  paraOrientacao,
  PLANTAS,
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

type Selection = { kind: "event"; key: string } | { kind: "poi"; key: string } | null;

// Marcador curto exibido dentro do pin: usa o número da arena/sala quando
// existe (ex: "Arena 1 - Keeta" -> "1"), senão a primeira letra do nome.
function shortMarkerLabel(locationName: string): string {
  const match = locationName.match(/\d+/);
  return match ? match[0] : locationName.slice(0, 1).toUpperCase();
}

// Cada "sala" vira um pin. Quando mais de um evento acontece na mesma sala,
// mostramos o que está ao vivo agora ou, se nenhum, o próximo a começar.
function pickRoomPins(events: EventItem[], orientacao: OrientacaoPlanta): RoomPin[] {
  // A posição pode vir da planta (arenas) ou do próprio evento — quem decide
  // é `coordenadaDoEvento`; aqui só descartamos quem não tem nenhuma das duas.
  const withCoords = events.filter((e) => coordenadaDoEvento(e, orientacao) !== null);
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

    const ponto = coordenadaDoEvento(activeEvent, orientacao);
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

  // TEMPORÁRIO — comparação de orientação da planta. Existe só para o
  // organizador ver as duas versões lado a lado e escolher; depois da decisão
  // isto vira uma constante e o botão sai da tela.
  const [orientacao, setOrientacao] = useState<OrientacaoPlanta>("horizontal");

  const zoomPanRef = useRef<ZoomPanHandle>(null);

  const planta = PLANTAS[orientacao];
  const PLANTA_IMAGE = planta.image;
  const PLANTA_NATIVE_WIDTH = planta.width;
  const PLANTA_NATIVE_HEIGHT = planta.height;

  const content = { width: PLANTA_NATIVE_WIDTH, height: PLANTA_NATIVE_HEIGHT };

  // Escala mínima: a planta sempre cobre a viewport inteira, nunca menos —
  // é a garantia de que nunca aparece fundo vazio ao redor do mapa.
  const coverScale = viewport ? computeCoverScale(viewport, content) : 1;
  const maxScale = coverScale * MAX_ZOOM_MULTIPLIER;

  const handleLayout = (event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setViewport({ width, height });
  };

  useEffect(() => {
    load();
    loadFavorites();
  }, [load, loadFavorites]);

  const pins = useMemo(() => pickRoomPins(events, orientacao), [events, orientacao]);

  // Os pontos de interesse são medidos na planta horizontal; a vertical sai
  // deles por rotação (ver planta.ts).
  const poisNaOrientacao = useMemo(
    () => POINTS_OF_INTEREST.map((poi) => ({ ...poi, ...paraOrientacao(poi, orientacao) })),
    [orientacao]
  );

  // Palestra favoritada mais relevante agora: a que já começou (se houver)
  // ou, senão, a próxima a começar — é nela que focamos o mapa ao abrir a
  // tela, pra já mostrar de cara a arena/estande de quem o usuário marcou.
  const nextFavoriteEvent = useMemo(() => {
    const now = new Date();
    const withCoords = favorites.filter((e) => coordenadaDoEvento(e, orientacao) !== null);
    const live = withCoords.find((e) => getEventStatus(e, now) === "live");
    if (live) return live;

    return withCoords
      .filter((e) => getEventStatus(e, now) === "upcoming")
      .sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())[0];
  }, [favorites, orientacao]);

  const focusEventId = route.params?.focusEventId;

  // Trocar de orientação troca o sistema de coordenadas inteiro: o
  // enquadramento anterior não quer dizer nada no novo. Liberar o "já
  // centralizou" faz o efeito abaixo reenquadrar do zero.
  useEffect(() => {
    hasCenteredRef.current = false;
  }, [orientacao]);

  // Enquadramento inicial: sempre na escala "cover" (nunca a planta inteira
  // encolhida). Se não veio um foco explícito (navegação a partir do
  // detalhe de um evento), centraliza na próxima palestra favoritada; sem
  // favoritos (ou ainda carregando), centraliza a planta inteira — cortada
  // simetricamente, já que cover nunca mostra tudo numa tela desproporcional.
  useEffect(() => {
    if (!viewport || hasCenteredRef.current || focusEventId) return;
    if (favoritesStatus === "loading") return; // espera decidir com a lista certa

    hasCenteredRef.current = true;

    const alvo = nextFavoriteEvent && coordenadaDoEvento(nextFavoriteEvent, orientacao);
    if (nextFavoriteEvent && alvo) {
      const pin = pins.find((p) => p.locationName === nextFavoriteEvent.locationName);
      if (pin) setSelection({ kind: "event", key: pin.key });

      zoomPanRef.current?.centerOn(
        alvo.x * PLANTA_NATIVE_WIDTH,
        alvo.y * PLANTA_NATIVE_HEIGHT,
        coverScale
      );
    } else {
      zoomPanRef.current?.centerOn(PLANTA_NATIVE_WIDTH / 2, PLANTA_NATIVE_HEIGHT / 2, coverScale);
    }
  }, [
    viewport,
    coverScale,
    focusEventId,
    favoritesStatus,
    nextFavoriteEvent,
    pins,
    orientacao,
    PLANTA_NATIVE_WIDTH,
    PLANTA_NATIVE_HEIGHT,
  ]);

  useEffect(() => {
    if (!focusEventId || pins.length === 0 || !viewport) return;

    const pin = pins.find((p) => p.activeEvent.id === focusEventId);
    if (pin) {
      hasCenteredRef.current = true;
      setSelection({ kind: "event", key: pin.key });
      zoomPanRef.current?.centerOn(pin.x * PLANTA_NATIVE_WIDTH, pin.y * PLANTA_NATIVE_HEIGHT, coverScale);
    }
  }, [focusEventId, pins, viewport, coverScale, PLANTA_NATIVE_WIDTH, PLANTA_NATIVE_HEIGHT]);

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
    selection?.kind === "poi" ? poisNaOrientacao.find((p) => p.key === selection.key) : undefined;

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
            minScale={coverScale}
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
              {pins.map((pin) => (
                <PlantaPin
                  key={`event-${pin.key}`}
                  x={pin.x}
                  y={pin.y}
                  color={STATUS_COLOR[getEventStatus(pin.activeEvent)]}
                  highlighted={selection?.kind === "event" && selection.key === pin.key}
                  label={shortMarkerLabel(pin.locationName)}
                  sizeMultiplier={1 / coverScale}
                  onPress={() => setSelection({ kind: "event", key: pin.key })}
                />
              ))}
              {poisNaOrientacao.map((poi) => (
                <PlantaPin
                  key={`poi-${poi.key}`}
                  x={poi.x}
                  y={poi.y}
                  color={POI_COLOR}
                  highlighted={selection?.kind === "poi" && selection.key === poi.key}
                  label={poi.marker}
                  sizeMultiplier={1 / coverScale}
                  onPress={() => setSelection({ kind: "poi", key: poi.key })}
                />
              ))}
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

        {/* TEMPORÁRIO — alterna entre as duas versões da planta para a
            escolha da orientação. Sai da tela junto com o estado `orientacao`
            assim que a decisão for tomada. */}
        <Pressable
          style={styles.orientacaoBotao}
          onPress={() =>
            setOrientacao((o) => (o === "horizontal" ? "vertical" : "horizontal"))
          }
          accessibilityRole="button"
          accessibilityLabel={
            orientacao === "horizontal"
              ? "Ver a planta na vertical"
              : "Ver a planta na horizontal"
          }
        >
          <Text style={styles.orientacaoTexto}>
            {orientacao === "horizontal" ? "Ver vertical" : "Ver horizontal"}
          </Text>
        </Pressable>

        <View style={styles.zoomControls}>
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
  // TEMPORÁRIO — botão de comparação de orientação.
  orientacaoBotao: {
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
  orientacaoTexto: {
    color: colors.textOnDark,
    fontSize: 13,
    fontWeight: "700",
  },
  zoomControls: {
    position: "absolute",
    right: spacing.sm,
    bottom: spacing.sm,
    gap: spacing.xs,
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
