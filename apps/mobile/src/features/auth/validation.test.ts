import { describe, expect, it } from "vitest";
import { authErrorMessage, validateEmail, validatePassword } from "./validation";

describe("e-mail", () => {
  it("aceita endereço comum", () => {
    expect(validateEmail("tutor@exemplo.com.br")).toBeNull();
  });

  it("aceita com sinal de mais", () => {
    // Gmail usa muito. Rejeitar seria um bug irritante e comum.
    expect(validateEmail("tutor+nina@gmail.com")).toBeNull();
  });

  it("ignora espaço em volta", () => {
    // Teclado de celular adiciona espaço no fim o tempo todo.
    expect(validateEmail("  tutor@exemplo.com  ")).toBeNull();
  });

  it("recusa vazio", () => {
    expect(validateEmail("")).toBeTruthy();
  });

  it("recusa sem arroba", () => {
    expect(validateEmail("tutor.exemplo.com")).toBeTruthy();
  });

  it("recusa sem domínio", () => {
    expect(validateEmail("tutor@")).toBeTruthy();
  });
});

describe("senha", () => {
  it("aceita a partir de oito", () => {
    expect(validatePassword("senhaboa1")).toBeNull();
  });

  it("recusa curta", () => {
    expect(validatePassword("1234567")).toBeTruthy();
  });

  it("recusa vazia", () => {
    expect(validatePassword("")).toBeTruthy();
  });
});

describe("mensagem de erro", () => {
  it("traduz credencial inválida", () => {
    const msg = authErrorMessage(new Error("Invalid login credentials"));
    expect(msg).toBe("E-mail ou senha incorretos");
  });

  it("sugere entrar quando o e-mail já existe", () => {
    const msg = authErrorMessage(new Error("User already registered"));
    expect(msg).toContain("já tem conta");
  });

  it("explica e-mail não confirmado", () => {
    const msg = authErrorMessage(new Error("Email not confirmed"));
    expect(msg).toContain("Confirme");
  });

  it("nunca vaza jargão do servidor", () => {
    const msg = authErrorMessage(new Error("PGRST301: JWT expired at 1784..."));
    expect(msg).not.toContain("PGRST");
    expect(msg).not.toContain("JWT");
  });

  it("lida com erro que não é Error", () => {
    expect(authErrorMessage("algo estranho")).toBeTruthy();
  });
});
