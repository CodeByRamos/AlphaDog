import { formatBRL, PLANS, pricePerDayCents } from "@alphadog/core";
import { Ionicons } from "@expo/vector-icons";
import { useQueryClient } from "@tanstack/react-query";
import * as Linking from "expo-linking";
import { Platform, Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { Button } from "../src/components/Button";
import { Logo } from "../src/components/Logo";
import { Screen, screenPadding } from "../src/components/Screen";
import { useAuth } from "../src/state/auth";
import { color, radius, space, type } from "../src/theme";

/**
 * Tela de acesso — o paywall do app.
 *
 * A assinatura é contratada NO SITE, nunca aqui. O app apenas reconhece o
 * acesso que já existe na conta. Isso é decisão de arquitetura e de conformidade
 * ao mesmo tempo:
 *
 * - A Apple exige In-App Purchase para venda de conteúdo digital dentro do app
 *   (Guideline 3.1.1), com 15–30% de comissão. Vender por PIX ou cartão próprio
 *   dentro do app iOS é rejeição garantida.
 * - A Guideline 3.1.3(b) (serviços multiplataforma) PERMITE que o app dê acesso
 *   a conteúdo adquirido em outra plataforma. O que ela proíbe é DIRECIONAR o
 *   usuário para comprar fora: nada de link, botão, preço ou instrução.
 *
 * Por isso a tela muda de forma por plataforma, e não por gosto:
 *   iOS     — só informa que a conta não tem acesso ativo. Sem preço, sem link,
 *             sem "assine no site". Qualquer uma dessas coisas é motivo de
 *             rejeição.
 *   Android — a Play Store permite direcionar para pagamento externo, então
 *             mostra os planos e leva ao site.
 */

/** Onde a assinatura acontece. Só usado fora do iOS. */
const SITE_URL = "https://alphadog.com.br/assinar";

const INCLUDES = [
  { text: "Plano montado a partir do perfil do seu cão", soon: false },
  { text: "11 exercícios guiados passo a passo", soon: false },
  { text: "Sessão cronometrada com registro de cada repetição", soon: false },
  { text: "Histórico, estatísticas e sequência diária", soon: false },
  { text: "Reconhecimento de postura pela câmera", soon: true },
  { text: "Feedback automático em tempo real", soon: true },
];

export default function Subscribe() {
  const { signOut, session } = useAuth();
  const queryClient = useQueryClient();
  const isIOS = Platform.OS === "ios";

  /** Revalida a assinatura — para quem acabou de assinar em outro aparelho. */
  function recheck() {
    queryClient.invalidateQueries({ queryKey: ["subscription"] });
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

        <Text style={styles.eyebrow}>Acesso</Text>
        <Text style={styles.title}>
          {isIOS ? "Sua conta ainda não tem acesso" : "Comece a treinar o seu cão"}
        </Text>
        <Text style={styles.lead}>
          {isIOS
            ? "O AlphaDog libera todos os treinos assim que a sua conta tiver acesso ativo. Se você já ativou, use o botão abaixo para atualizar."
            : "Dez minutos por dia, um plano feito para ele, e o registro de cada sessão. Uma assinatura destrava o app inteiro."}
        </Text>

        {session?.user.email ? (
          <View style={styles.account}>
            <Ionicons name="person-circle-outline" size={18} color={color.ink400} />
            <Text style={styles.accountText}>{session.user.email}</Text>
          </View>
        ) : null}

        {/* O que a assinatura inclui. Descrever o produto é permitido nas duas
            lojas; o que não pode, no iOS, é preço e caminho de compra. */}
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

        {/* Planos e preços: fora do iOS apenas. */}
        {!isIOS && (
          <View style={styles.plans}>
            {PLANS.map((plan) => (
              <View key={plan.id} style={styles.plan}>
                <View>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planPerDay}>
                    {formatBRL(pricePerDayCents(plan))} por dia
                  </Text>
                </View>
                <View style={styles.planRight}>
                  {plan.badge ? <Text style={styles.planBadge}>{plan.badge}</Text> : null}
                  <Text style={styles.planPrice}>{formatBRL(plan.priceCents)}</Text>
                </View>
              </View>
            ))}
          </View>
        )}

        {isIOS ? (
          <>
            <Button label="Já ativei — atualizar" onPress={recheck} />
            <Text style={styles.footnote}>
              Use o mesmo e-mail desta conta para que o acesso apareça aqui.
            </Text>
          </>
        ) : (
          <>
            <Button
              label="Assinar no site"
              onPress={() => Linking.openURL(SITE_URL)}
            />
            <Pressable onPress={recheck} accessibilityRole="button" style={styles.recheck}>
              <Text style={styles.recheckText}>Já assinei — atualizar</Text>
            </Pressable>
            <Text style={styles.footnote}>
              Assine com o mesmo e-mail desta conta. O acesso libera sozinho em
              alguns segundos após a confirmação do pagamento.
            </Text>
          </>
        )}
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
  account: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    paddingVertical: space.sm,
  },
  accountText: { ...type.bodySmall, color: color.ink400 },
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
    borderWidth: 1,
    borderColor: color.ink700,
    borderRadius: radius.lg,
    padding: space.lg,
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
  recheck: { alignItems: "center", paddingVertical: space.md },
  recheckText: { ...type.label, color: color.alpha400 },
  footnote: { ...type.caption, color: color.ink500, textAlign: "center" },
});
