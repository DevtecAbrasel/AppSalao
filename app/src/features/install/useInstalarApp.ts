import { useCallback, useEffect, useState } from "react";
import { Platform } from "react-native";

// O `beforeinstallprompt` não é padronizado — só o Chromium implementa — então
// declaramos só o que usamos em vez de depender de um tipo global.
interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

/**
 * Como este visitante consegue instalar:
 * - "prompt": o navegador já se declarou pronto para instalar (Chrome/Edge).
 *   Um toque resolve.
 * - "ios": Safari/iOS não expõe API nenhuma para isso. A única saída é
 *   ensinar o caminho do menu Compartilhar.
 * - "menu": dá para instalar, mas pelo menu do navegador. É o caso do Chrome
 *   no Android ANTES de ele disparar o `beforeinstallprompt` — o evento só vem
 *   depois de a pessoa ter interagido com a página por volta de 30 segundos, e
 *   até lá esconder o convite deixaria o cabeçalho vazio justo para quem
 *   acabou de chegar.
 * - "nenhum": ou já está instalado, ou é um navegador de desktop sem nenhum
 *   dos caminhos (Firefox, Safari) — aí não há o que oferecer.
 */
export type ModoInstalacao = "prompt" | "ios" | "menu" | "nenhum";

function ehWeb(): boolean {
  return Platform.OS === "web" && typeof window !== "undefined";
}

// Já aberto como app instalado? Aí o convite não faz sentido.
function rodandoInstalado(): boolean {
  if (!ehWeb()) return false;
  const porDisplayMode = window.matchMedia?.("(display-mode: standalone)").matches === true;
  // O iOS só passou a suportar display-mode standalone no 16.4; antes disso o
  // único sinal era esta propriedade fora do padrão.
  const porNavigator = (window.navigator as { standalone?: boolean }).standalone === true;
  return porDisplayMode || porNavigator;
}

function ehIOS(): boolean {
  if (!ehWeb()) return false;
  const ua = window.navigator.userAgent;
  if (/iPad|iPhone|iPod/.test(ua)) return true;
  // iPadOS 13+ se identifica como Mac; o que o denuncia é ter tela sensível
  // ao toque, coisa que um Mac de verdade não reporta.
  return window.navigator.platform === "MacIntel" && window.navigator.maxTouchPoints > 1;
}

// Celular ou tablet. Serve só para decidir se vale ensinar o caminho do menu:
// no desktop sem suporte a instalação (Firefox, Safari) não há o que ensinar.
function ehMobile(): boolean {
  if (!ehWeb()) return false;
  if (/Android|iPad|iPhone|iPod|Mobile|Tablet/i.test(window.navigator.userAgent)) return true;
  return ehIOS();
}

export function useInstalarApp() {
  const [evento, setEvento] = useState<BeforeInstallPromptEvent | null>(null);
  const [instalado, setInstalado] = useState(() => rodandoInstalado());

  useEffect(() => {
    if (!ehWeb()) return;

    // O navegador dispara isto quando decide que o site é instalável, o que
    // pode acontecer depois da tela já ter montado — daí guardar o evento em
    // vez de perguntar o estado uma vez só.
    const aoPoderInstalar = (e: Event) => {
      e.preventDefault(); // segura o banner nativo: quem convida é o app
      setEvento(e as BeforeInstallPromptEvent);
    };

    const aoInstalar = () => {
      setInstalado(true);
      setEvento(null);
    };

    window.addEventListener("beforeinstallprompt", aoPoderInstalar);
    window.addEventListener("appinstalled", aoInstalar);

    // Instalar pelo menu do navegador (em vez do nosso botão) não dispara
    // "appinstalled" em toda versão; observar o display-mode cobre esse caso.
    const mq = window.matchMedia?.("(display-mode: standalone)");
    const aoMudarModo = (e: MediaQueryListEvent) => setInstalado(e.matches);
    mq?.addEventListener?.("change", aoMudarModo);

    return () => {
      window.removeEventListener("beforeinstallprompt", aoPoderInstalar);
      window.removeEventListener("appinstalled", aoInstalar);
      mq?.removeEventListener?.("change", aoMudarModo);
    };
  }, []);

  // Ordem importa: o iOS vem antes do evento porque lá ele nunca chega, e o
  // "menu" é o piso — só cai em "nenhum" quem realmente não tem como instalar.
  const modo: ModoInstalacao = instalado
    ? "nenhum"
    : ehIOS()
      ? "ios"
      : evento
        ? "prompt"
        : ehMobile()
          ? "menu"
          : "nenhum";

  // Devolve true se o app foi mesmo instalado, para a tela poder se fechar.
  const instalar = useCallback(async (): Promise<boolean> => {
    if (!evento) return false;
    await evento.prompt();
    const { outcome } = await evento.userChoice;
    // O evento é de uso único: depois de consumido o navegador manda outro se
    // ainda fizer sentido.
    setEvento(null);
    return outcome === "accepted";
  }, [evento]);

  return { modo, instalar };
}
