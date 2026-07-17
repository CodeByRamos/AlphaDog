/**
 * Validação de credenciais, no cliente.
 *
 * Só para dar erro imediato em vez de esperar o round-trip. Quem valida de
 * verdade é o Supabase — isto aqui é conveniência, não segurança.
 */

export function validateEmail(value: string): string | null {
  const email = value.trim();
  if (!email) return "Informe seu e-mail";
  // Proposital: não é a RFC 5322. Regex de e-mail "correta" rejeita endereço
  // válido mais vezes do que pega inválido. O servidor confere.
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(email)) return "Confira o e-mail";
  return null;
}

/** Mínimo do Supabase é 6. Oito é o que faz diferença real contra força bruta. */
export const MIN_PASSWORD = 8;

export function validatePassword(value: string): string | null {
  if (!value) return "Crie uma senha";
  if (value.length < MIN_PASSWORD) {
    return `Use pelo menos ${MIN_PASSWORD} caracteres`;
  }
  return null;
}

/**
 * Traduz o erro do Supabase.
 *
 * As mensagens vêm em inglês e falam de implementação ("invalid login
 * credentials"). O tutor precisa saber o que fazer, não o que o servidor achou.
 */
export function authErrorMessage(error: unknown): string {
  const raw = error instanceof Error ? error.message : String(error);
  const msg = raw.toLowerCase();

  if (msg.includes("invalid login credentials")) return "E-mail ou senha incorretos";
  if (msg.includes("already registered") || msg.includes("already been registered")) {
    return "Este e-mail já tem conta. Tente entrar.";
  }
  if (msg.includes("email not confirmed")) {
    return "Confirme seu e-mail antes de entrar. Veja sua caixa de entrada.";
  }
  if (msg.includes("invalid") && msg.includes("email")) return "Confira o e-mail";
  if (msg.includes("password")) return `A senha precisa de ${MIN_PASSWORD}+ caracteres`;
  if (msg.includes("rate limit") || msg.includes("too many")) {
    return "Muitas tentativas. Espere um minuto.";
  }
  if (msg.includes("network") || msg.includes("fetch")) {
    return "Sem conexão. Confira sua internet.";
  }
  return "Não foi possível continuar. Tente de novo.";
}
