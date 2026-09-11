import { env } from "../env";

/**
 * O e-mail de recuperação de senha.
 *
 * Fica separado da rota porque é conteúdo, não regra: quem for ajustar o
 * texto ou a marca mexe só aqui.
 */
export function montarEmailDeRecuperacao(token: string) {
  // O app é uma página só (React Navigation, sem rotas na URL), então o link
  // traz o token na query e a própria abertura do app decide mostrar a tela
  // de nova senha. `encodeURIComponent` porque o JWT tem pontos e traços que
  // sobrevivem, mas a escapada é o que garante isso continuar verdade se o
  // formato do token mudar.
  const link = `${env.APP_PUBLIC_URL}/?reset=${encodeURIComponent(token)}`;

  return {
    subject: "Redefinir sua senha do Salão Abrasel",
    text: [
      "Você pediu para redefinir a senha da sua conta no app do Salão Abrasel.",
      "",
      `Abra este link para escolher uma nova senha: ${link}`,
      "",
      "O link vale por 1 hora e só pode ser usado uma vez.",
      "Se não foi você que pediu, ignore esta mensagem — sua senha continua a mesma.",
    ].join("\n"),
    html: `
      <div style="font-family: -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; background: #F7F1EC; padding: 24px;">
        <div style="max-width: 480px; margin: 0 auto; background: #ffffff; border: 1px solid #E7DFD3; padding: 24px;">
          <p style="margin: 0 0 4px; font-size: 11px; letter-spacing: 1px; text-transform: uppercase; font-weight: 700; color: #EA5E81;">Salão Abrasel · 2026</p>
          <h1 style="margin: 0 0 16px; font-size: 20px; color: #15243C;">Redefinir sua senha</h1>
          <p style="margin: 0 0 16px; font-size: 15px; line-height: 22px; color: #5B6B80;">
            Você pediu para redefinir a senha da sua conta no app do evento.
            Toque no botão abaixo para escolher uma nova.
          </p>
          <p style="margin: 0 0 20px;">
            <a href="${link}" style="display: inline-block; background: #EA5E81; color: #ffffff; text-decoration: none; font-weight: 700; font-size: 15px; padding: 12px 24px; border-radius: 999px;">Escolher nova senha</a>
          </p>
          <p style="margin: 0 0 16px; font-size: 13px; line-height: 19px; color: #5B6B80;">
            O link vale por 1 hora e só pode ser usado uma vez. Se não foi você
            que pediu, ignore esta mensagem — sua senha continua a mesma.
          </p>
          <p style="margin: 0; font-size: 12px; line-height: 18px; color: #9AA0A6; word-break: break-all;">
            Se o botão não funcionar, copie este endereço no navegador:<br />${link}
          </p>
        </div>
      </div>
    `,
  };
}
