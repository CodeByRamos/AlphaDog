import {
  DEFAULT_PLAN_ID,
  formatBRL,
  PLANS,
  pricePerDayCents,
  type PlanId,
} from "@alphadog/core";
import { Ionicons } from "@expo/vector-icons";
import { useState } from "react";
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../src/components/Button";
import { Logo } from "../src/components/Logo";
import { Screen, screenPadding } from "../src/components/Screen";
import { useAuth } from "../src/state/auth";
import { color, radius, space, type } from "../src/theme";

/** O que a assinatura inclui. `soon` marca o que ainda está em desenvolvimento. */
const INCLUDES = [
  { text: "Plano montado a partir do perfil do seu cão", soon: false },
  { text: "Exercícios guiados passo a passo, com o erro comum antes", soon: false },
  { text: "Sessão cronometrada com registro real de cada repetição", soon: false },
  { text: "Histórico, estatísticas e sequência diária", soon: false },
  { text: "Reconhecimento de postura pela câmera", soon: true },
  { text: "Feedback automático em tempo real", soon: true },
];

const FAQ = [
  {
    q: "Como funciona a cobrança?",
    a: "É uma assinatura recorrente: o acesso fica ativo enquanto o plano estiver pago. Você pode cancelar quando quiser, direto na sua conta, e o acesso continua até o fim do período já pago.",
  },
  {
    q: "A câmera com IA já funciona?",
    a: "Ainda não — o reconhecimento de postura está em treinamento e aparece marcado como “Em breve”. Hoje quem marca o acerto é você. Quando a câmera ficar pronta, entra por atualização, sem custo extra para quem já assina.",
  },
  {
    q: "Posso cancelar quando quiser?",
    a: "Sim, sem multa e sem burocracia. O acesso vai até o fim do período que você já pagou.",
  },
];

/**
 * Tela de assinatura — o paywall do app.
 *
 * O app é 100% pago: sem assinatura ativa, o tutor cai aqui e só sai daqui
 * assinando (ou saindo da conta). A tela vende o que existe hoje e marca o que é
 * roadmap — vender no presente uma IA que não está no ar seria enganoso, ainda
 * mais na tela onde o dinheiro troca de mãos.
 *
 * O checkout real ainda não está ligado (a cobrança entra quando houver conta no
 * gateway). Até lá, o botão explica isso em vez de fingir que ativou — um
 * "assinatura ativada" falso é o mesmo pecado do "Excelente!" sem o cão sentar.
 */
export default function Subscribe() {
  const { signOut } = useAuth();
  const [planId, setPlanId] = useState<PlanId>(DEFAULT_PLAN_ID);
  const selected = PLANS.find((p) => p.id === planId)!;

  function handleSubscribe() {
    // Placeholder honesto: sem gateway configurado, não há como assinar de
    // verdade. Não simula sucesso.
    Alert.alert(
      "Pagamento em configuração",
      "O checkout entra assim que a conta de pagamento estiver ligada. A tela e os planos já estão prontos — falta só conectar o gateway.",
      [{ text: "Entendi" }],
    );
  }

  return (
    <Screen>
      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.header}>
          <Logo size={40} />
          <Pressable
            onPress={signOut}
            hitSlop={12}
            accessibilityRole="button"
            accessibilityLabel="Sair da conta"
          >
            <Text style={styles.signOut}>Sair</Text>
          </Pressable>
        </View>

        <Text style={styles.eyebrow}>Acesso completo</Text>
        <Text style={styles.title}>Comece a treinar o seu cão hoje</Text>
        <Text style={styles.lead}>
          Dez minutos por dia, um plano feito para ele, e o registro de cada
          sessão. Uma assinatura destrava o app inteiro.
        </Text>

        {/* O que inclui */}
        <View style={styles.includes}>
          {INCLUDES.map((item) => (
            <View key={item.text} style={styles.includeRow}>
              <Ionicons
                name={item.soon ? "time-outline" : "checkmark-circle"}
                size={20}
                color={item.soon ? color.alpha400 : color.sage400}
                style={styles.includeIcon}
              />
              <Text style={styles.includeText}>
                {item.text}
                {item.soon ? <Text style={styles.soonTag}>  · Em breve</Text> : null}
              </Text>
            </View>
          ))}
        </View>

        {/* Seletor de plano */}
        <View style={styles.plans}>
          {PLANS.map((plan) => {
            const active = plan.id === planId;
            const perDay = formatBRL(pricePerDayCents(plan));
            return (
              <Pressable
                key={plan.id}
                onPress={() => setPlanId(plan.id)}
                accessibilityRole="radio"
                accessibilityState={{ selected: active }}
                style={[styles.plan, active && styles.planActive]}
              >
                <View style={styles.planLeft}>
                  <View
                    style={[styles.radio, active && styles.radioActive]}
                  >
                    {active && <View style={styles.radioDot} />}
                  </View>
                  <View>
                    <Text style={styles.planName}>{plan.name}</Text>
                    <Text style={styles.planPerDay}>{perDay} por dia</Text>
                  </View>
                </View>
                <View style={styles.planRight}>
                  {plan.badge && (
                    <Text style={styles.planBadge}>{plan.badge}</Text>
                  )}
                  <Text style={styles.planPrice}>{formatBRL(plan.priceCents)}</Text>
                </View>
              </Pressable>
            );
          })}
        </View>

        <Button label={`Assinar — ${selected.name}`} onPress={handleSubscribe} />
        <Text style={styles.recurring}>
          Cobrança recorrente de {formatBRL(selected.priceCents)} a cada{" "}
          {selected.days} dias. Cancele quando quiser; o acesso vai até o fim do
          período pago.
        </Text>

        {/* FAQ */}
        <View style={styles.faq}>
          {FAQ.map((item) => (
            <View key={item.q} style={styles.faqItem}>
              <Text style={styles.faqQ}>{item.q}</Text>
              <Text style={styles.faqA}>{item.a}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: screenPadding, paddingBottom: space["3xl"], gap: space.lg },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: space.sm,
  },
  signOut: { ...type.label, color: color.ink300 },
  eyebrow: { ...type.overline, color: color.alpha400 },
  title: { ...type.title, color: color.white, marginTop: -space.sm },
  lead: { ...type.body, color: color.ink300 },
  includes: {
    gap: space.md,
    backgroundColor: color.ink800,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  includeRow: { flexDirection: "row", alignItems: "flex-start", gap: space.md },
  includeIcon: { marginTop: 1 },
  includeText: { ...type.body, color: color.ink100, flex: 1 },
  soonTag: { ...type.caption, color: color.alpha400 },
  plans: { gap: space.md, marginTop: space.sm },
  plan: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    borderWidth: 1.5,
    borderColor: color.ink700,
    borderRadius: radius.lg,
    padding: space.lg,
  },
  planActive: { borderColor: color.alpha500, backgroundColor: color.ink800 },
  planLeft: { flexDirection: "row", alignItems: "center", gap: space.md },
  radio: {
    width: 22,
    height: 22,
    borderRadius: radius.pill,
    borderWidth: 2,
    borderColor: color.ink500,
    alignItems: "center",
    justifyContent: "center",
  },
  radioActive: { borderColor: color.alpha500 },
  radioDot: {
    width: 10,
    height: 10,
    borderRadius: radius.pill,
    backgroundColor: color.alpha500,
  },
  planName: { ...type.subheading, color: color.white },
  planPerDay: { ...type.caption, color: color.ink400 },
  planRight: { alignItems: "flex-end", gap: space.xs },
  planBadge: {
    ...type.caption,
    color: color.ink900,
    backgroundColor: color.alpha400,
    paddingHorizontal: space.sm,
    paddingVertical: 2,
    borderRadius: radius.pill,
    overflow: "hidden",
    fontFamily: type.label.fontFamily,
  },
  planPrice: { ...type.subheading, color: color.white },
  recurring: { ...type.caption, color: color.ink400, textAlign: "center" },
  faq: { gap: space.lg, marginTop: space.lg },
  faqItem: { gap: space.xs },
  faqQ: { ...type.subheading, color: color.white },
  faqA: { ...type.bodySmall, color: color.ink300 },
});
