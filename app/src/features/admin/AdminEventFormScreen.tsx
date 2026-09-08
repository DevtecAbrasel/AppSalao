import { useMemo, useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { NativeStackScreenProps } from "@react-navigation/native-stack";
import { colors, radius, spacing, typography } from "../../constants/theme";
import { avisar, confirmar } from "../../lib/dialog";
import { AdminStackParamList } from "../../navigation/types";
import { useEventsStore } from "../events/store";
import { createEvent, updateEvent, EventPayload } from "./api";

type Props = NativeStackScreenProps<AdminStackParamList, "AdminEventForm">;

// O evento roda em horário de Brasília; gravamos o offset explícito para não
// depender do fuso do aparelho de quem está cadastrando.
const OFFSET_BRASILIA = "-03:00";

// Campos de texto em vez de um seletor nativo de data: adicionar
// @react-native-community/datetimepicker exigiria um novo build nativo, o que
// é justamente o que não se pode fazer com o evento acontecendo. O formato é
// o mesmo que a API já usa.
function paraIso(data: string, hora: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(data)) return null;
  if (!/^\d{2}:\d{2}$/.test(hora)) return null;
  const iso = `${data}T${hora}:00${OFFSET_BRASILIA}`;
  return Number.isNaN(new Date(iso).getTime()) ? null : iso;
}

function partesDe(iso: string): { data: string; hora: string } {
  const d = new Date(iso);
  const fmt = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const hm = new Intl.DateTimeFormat("pt-BR", {
    timeZone: "America/Sao_Paulo",
    hour: "2-digit",
    minute: "2-digit",
  });
  return { data: fmt.format(d), hora: hm.format(d) };
}

export function AdminEventFormScreen({ route, navigation }: Props) {
  const eventId = route.params?.eventId;
  const { events, refresh } = useEventsStore();
  const existente = useMemo(() => events.find((e) => e.id === eventId), [events, eventId]);

  const inicio = existente ? partesDe(existente.startTime) : { data: "", hora: "" };
  const fim = existente ? partesDe(existente.endTime) : { data: "", hora: "" };

  const [title, setTitle] = useState(existente?.title ?? "");
  const [description, setDescription] = useState(existente?.description ?? "");
  const [speaker, setSpeaker] = useState(existente?.speaker ?? "");
  const [locationName, setLocationName] = useState(existente?.locationName ?? "");
  const [category, setCategory] = useState(existente?.category ?? "");
  const [data, setData] = useState(inicio.data);
  const [horaInicio, setHoraInicio] = useState(inicio.hora);
  const [horaFim, setHoraFim] = useState(fim.hora);
  const [salvando, setSalvando] = useState(false);

  const salvar = async () => {
    const startTime = paraIso(data, horaInicio);
    const endTime = paraIso(data, horaFim);

    if (!title.trim()) return avisar("Faltou o título", "Informe o título da palestra.");
    if (!locationName.trim()) return avisar("Faltou o local", "Informe o local da palestra.");
    if (!startTime) return avisar("Data ou horário inválido", "Use AAAA-MM-DD e HH:MM.");
    if (!endTime) return avisar("Horário de término inválido", "Use HH:MM.");
    if (new Date(endTime) <= new Date(startTime)) {
      return avisar("Horários incoerentes", "O término precisa ser depois do início.");
    }

    const payload: EventPayload = {
      title: title.trim(),
      description: description.trim() || title.trim(),
      speaker: speaker.trim() || null,
      locationName: locationName.trim(),
      // Coordenadas do pin no mapa não são editadas aqui: são preservadas na
      // edição e ficam nulas na criação (a palestra aparece na agenda, só não
      // ganha pin até alguém definir a posição).
      locationMapX: existente?.locationMapX ?? null,
      locationMapY: existente?.locationMapY ?? null,
      startTime,
      endTime,
      category: category.trim() || null,
    };

    setSalvando(true);
    try {
      if (eventId) await updateEvent(eventId, payload);
      else await createEvent(payload);

      // Recarrega antes de voltar para a lista já refletir a mudança.
      await refresh();
      navigation.goBack();
    } catch (err) {
      avisar("Não foi possível salvar", err instanceof Error ? err.message : "Erro desconhecido");
    } finally {
      setSalvando(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.flex}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView style={styles.container} contentContainerStyle={styles.content}>
        <Campo label="Título" value={title} onChangeText={setTitle} placeholder="Nome da palestra" />
        <Campo
          label="Descrição"
          value={description}
          onChangeText={setDescription}
          placeholder="Sobre o que é a palestra"
          multiline
        />
        <Campo
          label="Palestrante"
          value={speaker}
          onChangeText={setSpeaker}
          placeholder="Opcional"
        />
        <Campo
          label="Local"
          value={locationName}
          onChangeText={setLocationName}
          placeholder="Ex: Arena 1 - Keeta"
        />
        <Campo
          label="Tipo"
          value={category}
          onChangeText={setCategory}
          placeholder="Ex: palestra, arena-1, cerimonia"
        />

        <View style={styles.linha}>
          <View style={styles.metade}>
            <Campo label="Data (AAAA-MM-DD)" value={data} onChangeText={setData} placeholder="2026-09-15" />
          </View>
        </View>
        <View style={styles.linha}>
          <View style={styles.metade}>
            <Campo label="Início (HH:MM)" value={horaInicio} onChangeText={setHoraInicio} placeholder="14:00" />
          </View>
          <View style={styles.metade}>
            <Campo label="Término (HH:MM)" value={horaFim} onChangeText={setHoraFim} placeholder="15:00" />
          </View>
        </View>

        <Text style={styles.nota}>Horários no fuso de Brasília (UTC−03:00).</Text>

        <Pressable style={[styles.salvar, salvando && styles.salvarDesabilitado]} onPress={salvar} disabled={salvando}>
          <Text style={styles.salvarTexto}>
            {salvando ? "Salvando..." : eventId ? "Salvar alterações" : "Criar palestra"}
          </Text>
        </Pressable>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Campo({
  label,
  multiline,
  ...props
}: React.ComponentProps<typeof TextInput> & { label: string }) {
  return (
    <View style={styles.campo}>
      <Text style={styles.campoLabel}>{label}</Text>
      <TextInput
        style={[styles.input, multiline && styles.inputMultiline]}
        placeholderTextColor={colors.textMuted}
        multiline={multiline}
        autoCapitalize="sentences"
        {...props}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  container: { flex: 1, backgroundColor: colors.background },
  content: { padding: spacing.md, paddingBottom: spacing.xl },
  campo: { marginBottom: spacing.md },
  campoLabel: { ...typography.label, color: colors.textMuted, marginBottom: spacing.xs },
  input: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm + 2,
    fontSize: 15,
    color: colors.text,
  },
  inputMultiline: { minHeight: 88, textAlignVertical: "top" },
  linha: { flexDirection: "row", gap: spacing.sm },
  metade: { flex: 1 },
  nota: { fontSize: 12, color: colors.textMuted, marginBottom: spacing.lg },
  salvar: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    borderRadius: radius.pill,
    alignItems: "center",
  },
  salvarDesabilitado: { opacity: 0.6 },
  salvarTexto: { color: "#fff", fontWeight: "700", fontSize: 15 },
});
