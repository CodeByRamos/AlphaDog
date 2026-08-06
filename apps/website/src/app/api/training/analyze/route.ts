import { EXERCISES, type ExerciseId } from "@alphadog/core";
import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import {
  analyzeExecution,
  isAcceptedMediaType,
  isAnalyzerConfigured,
  MAX_IMAGE_BYTES,
} from "../../../../features/training/analyzer";
import { getSubscription, hasAccess } from "../../../../features/billing/subscriptions";

/**
 * Análise de execução — o endpoint que o aplicativo chama com a foto.
 *
 * Três portas antes de gastar uma chamada ao modelo, nesta ordem, porque cada
 * uma é mais barata que a seguinte:
 *
 *   1. o token é de um usuário real?        (uma consulta ao Supabase)
 *   2. esse usuário tem assinatura ativa?   (uma consulta ao banco)
 *   3. ele não estourou o limite de uso?    (memória)
 *
 * A ordem importa: verificar assinatura antes de autenticar leria o banco por
 * conta de qualquer requisição anônima, e o limite antes da assinatura deixaria
 * um não-assinante consumir cota de quem paga.
 *
 * A chave da Anthropic vive SÓ aqui. O aplicativo nunca a vê — se ela estivesse
 * no APK, qualquer pessoa extrairia e passaria a gastar na nossa conta. Este
 * endpoint é a fronteira.
 */

export const dynamic = "force-dynamic";
export const runtime = "nodejs";
// Análise de imagem leva alguns segundos; o padrão da plataforma pode ser menor.
export const maxDuration = 30;

/**
 * Limite por usuário.
 *
 * Uma sessão de treino tem 5 a 8 repetições. Trinta análises por hora cobrem
 * três sessões seguidas com folga, e param um app modificado que tente usar a
 * conta como API de visão gratuita.
 *
 * Vive em memória de propósito: é uma trava de custo, não de segurança. Em
 * várias instâncias cada uma conta a sua, o que afrouxa o limite — e isso é
 * aceitável para o que ele protege. Uma trava real exigiria Redis, que é
 * infraestrutura a mais para um risco que ainda não existe.
 */
const RATE_LIMIT = 30;
const RATE_WINDOW_MS = 60 * 60 * 1000;

const usage = new Map<string, { count: number; resetAt: number }>();

function withinRateLimit(userId: string): boolean {
  const now = Date.now();
  const entry = usage.get(userId);

  if (!entry || entry.resetAt < now) {
    usage.set(userId, { count: 1, resetAt: now + RATE_WINDOW_MS });
    return true;
  }

  if (entry.count >= RATE_LIMIT) return false;

  entry.count += 1;
  return true;
}

/**
 * Usuário do token enviado pelo aplicativo.
 *
 * O app manda o access token do Supabase no cabeçalho Authorization. Validar
 * contra o servidor do Supabase é o que impede alguém de forjar um id: o token
 * é assinado, e só o Supabase sabe conferir a assinatura.
 */
async function userFromRequest(request: Request): Promise<string | null> {
  const header = request.headers.get("authorization");
  const token = header?.toLowerCase().startsWith("bearer ")
    ? header.slice(7).trim()
    : null;

  if (!token) return null;

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );

  const { data, error } = await supabase.auth.getUser(token);
  if (error || !data.user) return null;
  return data.user.id;
}

type Body = {
  exerciseId?: string;
  image?: string;
  mediaType?: string;
};

export async function POST(request: Request) {
  if (!isAnalyzerConfigured()) {
    return NextResponse.json(
      { error: "A avaliação automática está indisponível." },
      { status: 503 },
    );
  }

  const userId = await userFromRequest(request);
  if (!userId) {
    return NextResponse.json({ error: "Não autenticado." }, { status: 401 });
  }

  // O acesso é conferido no servidor, sempre. O aplicativo já esconde a tela de
  // quem não assinou, mas tela escondida é sugestão — um APK modificado ignora.
  const subscription = await getSubscription(userId);
  if (!hasAccess(subscription)) {
    return NextResponse.json({ error: "Assinatura inativa." }, { status: 402 });
  }

  if (!withinRateLimit(userId)) {
    return NextResponse.json(
      { error: "Muitas análises em pouco tempo. Tente de novo em alguns minutos." },
      { status: 429 },
    );
  }

  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Corpo inválido." }, { status: 400 });
  }

  const exerciseId = body.exerciseId;
  if (!exerciseId || !(exerciseId in EXERCISES)) {
    return NextResponse.json({ error: "Exercício inválido." }, { status: 400 });
  }

  const mediaType = body.mediaType ?? "image/jpeg";
  if (!isAcceptedMediaType(mediaType)) {
    return NextResponse.json({ error: "Formato de imagem não aceito." }, { status: 400 });
  }

  const image = body.image;
  if (!image || typeof image !== "string") {
    return NextResponse.json({ error: "Imagem ausente." }, { status: 400 });
  }

  // Base64 cresce ~4/3 sobre o binário. Conferir aqui evita mandar para a API
  // um payload que ela recusaria — e evita pagar por isso.
  const approximateBytes = Math.floor((image.length * 3) / 4);
  if (approximateBytes > MAX_IMAGE_BYTES) {
    return NextResponse.json(
      { error: "Imagem muito grande. Tente novamente." },
      { status: 413 },
    );
  }

  const result = await analyzeExecution({
    exerciseId: exerciseId as ExerciseId,
    imageBase64: image,
    mediaType,
  });

  return NextResponse.json(result);
}

/** GET responde o estado, para conferir a rota em produção sem gastar análise. */
export function GET() {
  return NextResponse.json({
    endpoint: "training-analyze",
    configured: isAnalyzerConfigured(),
  });
}
