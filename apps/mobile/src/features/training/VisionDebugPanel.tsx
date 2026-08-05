import { Ionicons } from "@expo/vector-icons";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { color, radius, space, type } from "../../theme";
import type { DetectorStatus } from "../../vision/detector";
import type { VisionTelemetry } from "./useVisionRate";

/**
 * Painel de diagnóstico da IA, aberto por toque no selo de estado.
 *
 * Existe porque diagnosticar este aplicativo dependia de cabo USB, adb e um
 * computador por perto — e cada rodada de "instala, testa, me manda o log"
 * custava uma build de vinte minutos. Aqui os mesmos números aparecem no
 * aparelho de quem estiver testando, inclusive um sócio do outro lado do país.
 *
 * Fica DISPONÍVEL EM PRODUÇÃO de propósito. Um painel escondido atrás de
 * `__DEV__` é um painel que não existe justamente quando o problema aparece:
 * no APK instalado, no aparelho de outra pessoa. Ele não abre sozinho e não
 * atrapalha quem não o procura.
 *
 * Os tempos são separados por etapa porque "está lento" e "está travado" têm
 * causas diferentes, e a etapa diz qual: conversão de pixels é a câmera,
 * inferência é o modelo, decodificação é o nosso código.
 */

type Props = {
  detector: DetectorStatus;
  telemetry: VisionTelemetry;
  analyzing: boolean;
  onClose: () => void;
};

export function VisionDebugPanel({ detector, telemetry, analyzing, onClose }: Props) {
  const total =
    telemetry.resizeMs + telemetry.prepMs + telemetry.inferMs + telemetry.decodeMs;

  return (
    <View style={styles.root}>
      <View style={styles.header}>
        <Text style={[type.overline, { color: color.alpha500 }]}>Diagnóstico da IA</Text>
        <Pressable onPress={onClose} hitSlop={16} accessibilityLabel="Fechar diagnóstico">
          <Ionicons name="close" size={20} color={color.ink300} />
        </Pressable>
      </View>

      <ScrollView style={styles.body} contentContainerStyle={styles.bodyContent}>
        <Section title="Modelo">
          <Row label="Estado" value={describeDetector(detector)} />
          {detector.kind === "ready" && (
            <Row label="Acelerador" value={detector.accelerator} />
          )}
          <Row label="Análise ligada" value={analyzing ? "sim" : "não"} />
        </Section>

        <Section title="Frames">
          <Row label="Recebidos" value={String(telemetry.seen)} />
          <Row label="Analisados" value={String(telemetry.analyzed)} />
          <Row
            label="Com falha"
            value={String(telemetry.failed)}
            alert={telemetry.failed > 0}
          />
          <Row label="Por segundo" value={`${telemetry.fps} fps`} />
        </Section>

        <Section title="Tempo por etapa">
          <Row label="Conversão de pixels" value={`${telemetry.resizeMs} ms`} />
          <Row label="Preparo do tensor" value={`${telemetry.prepMs} ms`} />
          <Row label="Inferência" value={`${telemetry.inferMs} ms`} />
          <Row label="Decodificação" value={`${telemetry.decodeMs} ms`} />
          <Row label="Total" value={`${total} ms`} />
        </Section>

        <Section title="Detecção">
          <Row
            label="Melhor confiança"
            value={
              telemetry.bestConfidence == null
                ? "—"
                : `${(telemetry.bestConfidence * 100).toFixed(1)}%`
            }
          />
          <Row label="Limiar" value="50%" />
        </Section>

        {telemetry.lastError && (
          <Section title="Última falha">
            {/* A etapa vem embutida na mensagem: sem ela, "Cannot read
                property of undefined" não distingue câmera de modelo. */}
            <Text style={styles.error}>{telemetry.lastError}</Text>
          </Section>
        )}

        <Text style={styles.hint}>
          Confiança perto de 0% com o cão no quadro significa que o modelo está
          recebendo a imagem errada. Confiança perto de 50% significa que o
          limiar é que está apertado.
        </Text>
      </ScrollView>
    </View>
  );
}

function describeDetector(detector: DetectorStatus): string {
  if (detector.kind === "loading") return "carregando";
  if (detector.kind === "unavailable") return detector.reason;
  return "pronto";
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

function Row({
  label,
  value,
  alert,
}: {
  label: string;
  value: string;
  alert?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, alert && { color: color.warn500 }]} numberOfLines={2}>
        {value}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    position: "absolute",
    left: space.lg,
    right: space.lg,
    top: "12%",
    maxHeight: "70%",
    backgroundColor: "rgba(5,7,11,0.96)",
    borderRadius: radius.xl,
    borderWidth: 1,
    borderColor: color.ink700,
    overflow: "hidden",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: space.lg,
    paddingVertical: space.md,
    borderBottomWidth: 1,
    borderBottomColor: color.ink700,
  },
  body: { flexGrow: 0 },
  bodyContent: { padding: space.lg, gap: space.lg },
  section: { gap: 4 },
  sectionTitle: {
    fontFamily: "Sora_700Bold",
    fontSize: 12,
    color: color.ink300,
    marginBottom: 4,
  },
  row: { flexDirection: "row", justifyContent: "space-between", gap: space.md },
  rowLabel: { fontFamily: "Inter_400Regular", fontSize: 12, color: color.ink400, flex: 1 },
  rowValue: {
    fontFamily: "Inter_600SemiBold",
    fontSize: 12,
    color: color.bone,
    fontVariant: ["tabular-nums"],
    flexShrink: 1,
    textAlign: "right",
  },
  error: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: color.warn500,
    lineHeight: 16,
  },
  hint: {
    fontFamily: "Inter_400Regular",
    fontSize: 11,
    color: color.ink500,
    lineHeight: 16,
  },
});
