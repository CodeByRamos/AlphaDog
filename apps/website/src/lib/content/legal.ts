import type { LegalSection } from "@/components/marketing/legal-page";
import { siteConfig } from "@/lib/site-config";

/**
 * Conteúdo legal.
 *
 * ATENÇÃO: estes textos são uma base de trabalho, escrita para refletir as
 * regras que o produto realmente implementa (renovação automática, garantia de
 * 30 dias, cancelamento sem multa). NÃO substituem revisão jurídica. Antes de
 * cobrar do primeiro cliente, um advogado precisa revisar à luz do Código de
 * Defesa do Consumidor e da LGPD, e os dados da empresa (razão social, CNPJ,
 * endereço) precisam entrar no lugar dos marcadores.
 */

export const LEGAL_UPDATED_AT = "15 de julho de 2026";

/** Marcador explícito — some quando os dados reais da empresa entrarem. */
export const COMPANY_PLACEHOLDER = "[RAZÃO SOCIAL] — [CNPJ] — [ENDEREÇO]";

export const terms: readonly LegalSection[] = [
  {
    heading: "1. Quem somos",
    paragraphs: [
      `O ${siteConfig.name} é um serviço digital de adestramento de cães operado por ${COMPANY_PLACEHOLDER}. Ao criar uma conta ou assinar, você concorda com estes termos.`,
    ],
  },
  {
    heading: "2. O que o serviço é — e o que não é",
    paragraphs: [
      "O AlphaDog oferece programas de adestramento educacionais, montados a partir das informações que você fornece sobre o seu cão. O conteúdo é produzido e revisado por adestradores e por profissional de comportamento animal.",
      "O serviço não é atendimento veterinário e não substitui consulta com médico-veterinário. Se o seu cão apresenta sinais de dor, doença ou agressividade com risco de lesão, procure um profissional presencialmente antes de iniciar qualquer treino.",
    ],
  },
  {
    heading: "3. Resultados",
    paragraphs: [
      "Adestramento depende de constância do tutor e do animal. Não prometemos resultado específico em prazo específico: os prazos citados no site refletem a experiência típica de quem segue o plano, não uma garantia de desempenho.",
    ],
  },
  {
    heading: "4. Sua conta",
    paragraphs: [
      "Você é responsável por manter a confidencialidade das suas credenciais e por toda atividade realizada na sua conta. A conta é pessoal e não deve ser compartilhada.",
    ],
  },
  {
    heading: "5. Uso do conteúdo",
    paragraphs: [
      "Todo o conteúdo do AlphaDog — vídeos, textos, guias e a própria marca — é protegido por direitos autorais. Sua assinatura dá a você uma licença pessoal, limitada e intransferível de acesso. Não é permitido redistribuir, revender ou reproduzir o conteúdo.",
    ],
  },
  {
    heading: "6. Cancelamento pela nossa parte",
    paragraphs: [
      "Podemos suspender ou encerrar contas que violem estes termos, notadamente em caso de compartilhamento indevido de conteúdo ou fraude no pagamento.",
    ],
  },
  {
    heading: "7. Alterações",
    paragraphs: [
      "Podemos atualizar estes termos. Mudanças relevantes serão comunicadas por e-mail com antecedência razoável, e você poderá cancelar sem custo caso não concorde.",
    ],
  },
  {
    heading: "8. Contato",
    paragraphs: [`Dúvidas sobre estes termos: ${siteConfig.contactEmail}.`],
  },
];

export const privacy: readonly LegalSection[] = [
  {
    heading: "1. Controlador dos dados",
    paragraphs: [
      `O tratamento dos seus dados é feito por ${COMPANY_PLACEHOLDER}, na forma da Lei Geral de Proteção de Dados (Lei 13.709/2018).`,
    ],
  },
  {
    heading: "2. Que dados coletamos",
    paragraphs: ["Coletamos apenas o necessário para entregar o serviço:"],
    bullets: [
      "Respostas do questionário sobre o seu cão: raça, idade, sexo, comportamento e rotina.",
      "Dados de contato: e-mail e, quando informado, nome.",
      "Dados de pagamento: processados pelo nosso provedor de pagamento. Não armazenamos números de cartão nos nossos servidores.",
      "Dados de uso: páginas acessadas, progresso nas aulas e origem da visita (UTM), para entender o que funciona.",
    ],
  },
  {
    heading: "3. Por que usamos",
    paragraphs: [
      "Usamos seus dados para montar o programa do seu cão, dar acesso à sua conta, processar a assinatura, prestar suporte e melhorar o produto.",
      "Só enviamos e-mails de marketing se você tiver optado por recebê-los, e o descadastro está em todo e-mail que enviamos.",
    ],
  },
  {
    heading: "4. Com quem compartilhamos",
    paragraphs: [
      "Compartilhamos dados apenas com operadores necessários ao funcionamento do serviço — provedor de pagamento, hospedagem, banco de dados e ferramenta de e-mail — e sempre no mínimo necessário. Não vendemos seus dados.",
    ],
  },
  {
    heading: "5. Seus direitos",
    paragraphs: [
      "A LGPD garante a você os direitos de confirmação, acesso, correção, anonimização, portabilidade, eliminação e revogação do consentimento.",
      `Para exercer qualquer um deles, escreva para ${siteConfig.contactEmail}. Respondemos em até 15 dias.`,
    ],
  },
  {
    heading: "6. Retenção",
    paragraphs: [
      "Mantemos seus dados enquanto sua conta existir. Após o encerramento, eliminamos ou anonimizamos os dados, salvo o que a lei exigir que seja retido — como registros fiscais e de acesso.",
    ],
  },
  {
    heading: "7. Cookies",
    paragraphs: [
      "Usamos cookies essenciais para manter sua sessão e lembrar o ponto do questionário. Cookies de medição só são usados com o seu consentimento.",
    ],
  },
];

export const subscriptionPolicy: readonly LegalSection[] = [
  {
    heading: "1. Como funciona a cobrança",
    paragraphs: [
      "Ao assinar, você escolhe um período — 1, 3 ou 6 meses — e paga o valor daquele período no ato. O preço promocional exibido vale para o primeiro ciclo.",
    ],
  },
  {
    heading: "2. Renovação automática",
    paragraphs: [
      "A assinatura renova automaticamente ao fim de cada período, pelo valor de renovação vigente, até que você cancele. Avisamos por e-mail antes de cada renovação.",
      "Desinstalar o aplicativo ou parar de usar o serviço não cancela a assinatura — o cancelamento precisa ser feito na sua conta.",
    ],
  },
  {
    heading: "3. Como cancelar",
    paragraphs: [
      "Você pode cancelar a qualquer momento, direto na sua conta, em Conta → Assinatura. Não há multa nem burocracia.",
      "Cancele antes da data de renovação para não ser cobrado pelo próximo ciclo. O acesso continua até o fim do período já pago.",
    ],
  },
  {
    heading: "4. Arrependimento",
    paragraphs: [
      "Nos termos do artigo 49 do Código de Defesa do Consumidor, você pode desistir da contratação em até 7 dias corridos a contar da compra, com devolução integral do valor pago.",
    ],
  },
  {
    heading: "5. Reembolso além dos 7 dias",
    paragraphs: ["Depois dos 7 dias, valem as regras da nossa garantia de 30 dias."],
  },
  {
    heading: "6. Mudança de preço",
    paragraphs: [
      "Se o valor de renovação mudar, avisamos com antecedência mínima de 30 dias por e-mail, e você pode cancelar antes que a mudança entre em vigor.",
    ],
  },
];

export const guarantee: readonly LegalSection[] = [
  {
    heading: "O que garantimos",
    paragraphs: [
      "Se você seguir o plano por 4 semanas e não vir mudança clara no comportamento do seu cão, devolvemos o valor pago. Sem discussão e sem taxa.",
    ],
  },
  {
    heading: "Condições",
    paragraphs: ["Para que a garantia valha, pedimos apenas duas coisas:"],
    bullets: [
      "Que o pedido seja feito em até 30 dias corridos a partir da compra.",
      "Que você tenha seguido o plano — ou seja, que haja registro de treino no aplicativo em pelo menos 14 dias dentro desse período.",
    ],
  },
  {
    heading: "Por que a segunda condição existe",
    paragraphs: [
      "Porque adestramento não acontece sem constância. A garantia cobre o nosso método não funcionar para o seu cão — não cobre o plano não ter sido colocado em prática.",
      "Se você tentou e a rotina não coube na sua vida, escreva para a gente mesmo assim. Preferimos resolver caso a caso a brigar por regra.",
    ],
  },
  {
    heading: "Como pedir",
    paragraphs: [
      `Escreva para ${siteConfig.contactEmail} com o e-mail da sua conta e o assunto "Garantia". Respondemos em até 3 dias úteis e o estorno é feito pelo mesmo meio de pagamento, no prazo do seu banco ou operadora.`,
    ],
  },
  {
    heading: "Direito de arrependimento",
    paragraphs: [
      "Independentemente desta garantia, você mantém o direito de arrependimento em até 7 dias corridos da compra, previsto no Código de Defesa do Consumidor, com devolução integral e sem qualquer condição.",
    ],
  },
];
