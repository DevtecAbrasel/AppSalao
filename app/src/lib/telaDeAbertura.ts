import { Platform } from "react-native";

/**
 * Tira a tela de abertura desenhada no `public/index.html`.
 *
 * Ela existe porque, aberto da tela inicial, o app é uma janela sem barra de
 * navegador: entre o toque no ícone e o React montar não há nada para ver, e
 * em branco isso parece um site travando. Quem decide a hora de sair é o app,
 * e não o HTML, porque só o app sabe quando a PRIMEIRA TELA DE VERDADE está
 * pronta — sair assim que o React monta trocaria a marca por um indicador de
 * carregando, que é uma piora.
 *
 * Idempotente: chamar duas vezes não faz nada na segunda.
 */
export function encerrarTelaDeAbertura(): void {
  if (Platform.OS !== "web" || typeof document === "undefined") return;

  const abertura = document.getElementById("abertura");
  if (!abertura || abertura.classList.contains("saindo")) return;

  abertura.classList.add("saindo");
  // Depois da transição de opacidade declarada no HTML (260ms), com folga.
  window.setTimeout(() => {
    abertura.parentNode?.removeChild(abertura);
  }, 400);
}
