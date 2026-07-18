import { useQueryClient } from "@tanstack/react-query";
import { useRouter } from "expo-router";
import { useState } from "react";
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
} from "react-native";
import Animated, { FadeInDown } from "react-native-reanimated";
import { Button } from "../../src/components/Button";
import { Field } from "../../src/components/Field";
import { Logo } from "../../src/components/Logo";
import { Screen } from "../../src/components/Screen";
import {
  authErrorMessage,
  validateEmail,
  validatePassword,
} from "../../src/features/auth/validation";
import { useAuth } from "../../src/state/auth";
import { color, duration, space, type } from "../../src/theme";

type Mode = "signIn" | "signUp";

export default function SignInScreen() {
  const router = useRouter();
  const { signIn, signUp } = useAuth();
  const queryClient = useQueryClient();

  const [mode, setMode] = useState<Mode>("signIn");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; form?: string }>({});
  const [busy, setBusy] = useState(false);
  const [confirmSent, setConfirmSent] = useState(false);

  const isSignUp = mode === "signUp";

  async function submit() {
    const emailError = validateEmail(email);
    // Só valida a força da senha no cadastro: no login, senha antiga curta
    // continua válida e barrar aqui impediria o usuário de entrar.
    const passwordError = isSignUp ? validatePassword(password) : password ? null : "Informe a senha";

    if (emailError || passwordError) {
      setErrors({ email: emailError ?? undefined, password: passwordError ?? undefined });
      return;
    }

    setErrors({});
    setBusy(true);

    try {
      if (isSignUp) {
        const { needsConfirmation } = await signUp(email, password);
        if (needsConfirmation) {
          // O Supabase criou o usuário mas não devolveu sessão. Sem esta tela o
          // app ficaria num loading eterno esperando uma sessão que não vem.
          setConfirmSent(true);
          return;
        }
      } else {
        await signIn(email, password);
      }
      // A sessão mudou: o cache de cães é de outro usuário.
      await queryClient.invalidateQueries();
      router.replace("/");
    } catch (err) {
      setErrors({ form: authErrorMessage(err) });
    } finally {
      setBusy(false);
    }
  }

  if (confirmSent) {
    return (
      <Screen style={styles.centered}>
        <Animated.View entering={FadeInDown.duration(duration.normal)} style={styles.confirm}>
          <Logo size={48} />
          <Text style={[type.title, styles.title]}>Confirme seu e-mail</Text>
          <Text style={[type.body, styles.muted]}>
            Enviamos um link para {email.trim()}. Abra e volte aqui para entrar.
          </Text>
          <Button
            label="Voltar para o login"
            variant="secondary"
            onPress={() => {
              setConfirmSent(false);
              setMode("signIn");
              setPassword("");
            }}
          />
        </Animated.View>
      </Screen>
    );
  }

  return (
    <Screen>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
        >
          <Animated.View entering={FadeInDown.duration(duration.normal)}>
            <Logo size={44} />
            <Text style={[type.hero, styles.title]}>
              {isSignUp ? "Criar conta" : "Bem-vindo de volta"}
            </Text>
            <Text style={[type.body, styles.muted]}>
              {isSignUp
                ? "Alguns segundos e o plano do seu cão começa."
                : "Entre para continuar o treino."}
            </Text>
          </Animated.View>

          <Animated.View
            entering={FadeInDown.duration(duration.normal).delay(80)}
            style={styles.form}
          >
            <Field
              label="E-mail"
              value={email}
              onChangeText={setEmail}
              error={errors.email}
              autoCapitalize="none"
              autoComplete="email"
              keyboardType="email-address"
              inputMode="email"
              placeholder="voce@email.com"
              textContentType="emailAddress"
            />

            <Field
              label="Senha"
              value={password}
              onChangeText={setPassword}
              error={errors.password}
              secureTextEntry
              autoCapitalize="none"
              // newPassword no cadastro: é o que faz o gerenciador do sistema
              // oferecer senha forte em vez de tentar preencher a antiga.
              autoComplete={isSignUp ? "new-password" : "current-password"}
              textContentType={isSignUp ? "newPassword" : "password"}
              placeholder={isSignUp ? "Pelo menos 8 caracteres" : "Sua senha"}
              onSubmitEditing={submit}
              returnKeyType="go"
            />

            {errors.form ? (
              <Text style={[type.bodySmall, styles.formError]} accessibilityRole="alert">
                {errors.form}
              </Text>
            ) : null}

            <Button
              label={isSignUp ? "Criar conta" : "Entrar"}
              onPress={submit}
              loading={busy}
            />
          </Animated.View>

          <Pressable
            onPress={() => {
              setMode(isSignUp ? "signIn" : "signUp");
              setErrors({});
            }}
            accessibilityRole="button"
            style={styles.switch}
          >
            <Text style={[type.bodySmall, { color: color.ink400 }]}>
              {isSignUp ? "Já tem conta? " : "Ainda não tem conta? "}
              <Text style={{ color: color.alpha500 }}>
                {isSignUp ? "Entrar" : "Criar agora"}
              </Text>
            </Text>
          </Pressable>
        </ScrollView>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  scroll: {
    flexGrow: 1,
    justifyContent: "center",
    padding: space.xl,
    gap: space["2xl"],
  },
  centered: { justifyContent: "center", padding: space.xl },
  confirm: { gap: space.lg, alignItems: "flex-start" },
  title: { color: color.bone, marginTop: space.lg },
  muted: { color: color.ink400, marginTop: space.sm },
  form: { gap: space.lg },
  formError: { color: color.warn500 },
  switch: { alignItems: "center", paddingVertical: space.md },
});
