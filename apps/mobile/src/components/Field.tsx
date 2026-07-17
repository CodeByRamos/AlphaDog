import { useState } from "react";
import { StyleSheet, Text, TextInput, View, type TextInputProps } from "react-native";
import { color, radius, space, type } from "../theme";

type Props = TextInputProps & {
  label: string;
  error?: string | null;
  /** Sufixo fixo, tipo "kg". Evita o usuário digitar a unidade. */
  suffix?: string;
};

export function Field({ label, error, suffix, ...input }: Props) {
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      <Text style={[type.label, styles.label]}>{label}</Text>

      <View
        style={[
          styles.box,
          focused && styles.boxFocused,
          !!error && styles.boxError,
        ]}
      >
        <TextInput
          {...input}
          onFocus={(e) => {
            setFocused(true);
            input.onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            input.onBlur?.(e);
          }}
          placeholderTextColor={color.ink500}
          // Sem isto o teclado do sistema entra claro sobre fundo escuro.
          keyboardAppearance="dark"
          accessibilityLabel={label}
          style={[type.body, styles.input]}
        />
        {suffix ? (
          <Text style={[type.body, { color: color.ink400 }]}>{suffix}</Text>
        ) : null}
      </View>

      {error ? (
        <Text style={[type.caption, styles.error]} accessibilityRole="alert">
          {error}
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { gap: space.sm },
  label: { color: color.ink300 },
  box: {
    flexDirection: "row",
    alignItems: "center",
    gap: space.sm,
    height: 52,
    paddingHorizontal: space.lg,
    borderRadius: radius.md,
    borderWidth: 2,
    borderColor: color.ink700,
    backgroundColor: color.ink800,
  },
  boxFocused: { borderColor: color.alpha500 },
  boxError: { borderColor: color.warn500 },
  input: { flex: 1, color: color.bone },
  error: { color: color.warn500 },
});
