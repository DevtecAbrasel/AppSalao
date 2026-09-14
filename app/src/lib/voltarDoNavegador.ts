import { useCallback, useEffect, useRef } from "react";
import { Platform } from "react-native";
import type { NavigationContainerRef } from "@react-navigation/native";

/**
 * Faz o botão Voltar do navegador andar para trás DENTRO do app.
 *
 * O problema: o React Navigation roda aqui sem configuração de links, então
 * navegar entre telas não mexe no histórico do navegador — a URL fica sempre
 * em "/". O efeito é que o Voltar, em qualquer tela, joga a pessoa para fora
 * do app inteiro em vez de recuar uma tela.
 *
 * A correção mantém uma ENTRADA SENTINELA no histórico enquanto houver para
 * onde voltar. O Voltar do navegador consome essa entrada; nós interceptamos,
 * recuamos uma tela no app e repomos a sentinela para o próximo Voltar.
 * Quando não há mais o que recuar não existe sentinela, e o Voltar sai do
 * app — numa única batida, como a pessoa espera.
 *
 * Por que não a configuração de links (`linking`) do React Navigation, que
 * seria o caminho canônico: ela dá URL a cada tela e resolveria isto de
 * brinde — mas passa a derivar o estado de navegação da URL, o que muda o
 * comportamento do F5 em todas as abas e exige mapear as rotas dos seis
 * navegadores. É a correção certa; só não é a correção para se fazer na
 * véspera do evento. Isto aqui tem alcance de exatamente uma coisa: o que o
 * Voltar faz.
 *
 * Uma sentinela cobre a pilha INTEIRA, não um nível cada. É de propósito: o
 * que importa é existir algo para o Voltar consumir enquanto houver para onde
 * recuar, e o `onStateChange` repõe a sentinela depois de cada recuo. Contar
 * níveis exigiria espelhar a pilha do React Navigation no histórico, que é
 * justamente o trabalho que o `linking` faz — e a metade do caminho.
 */

const CHAVE = "salaoAbraselSentinela";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Ref = React.RefObject<NavigationContainerRef<any> | null>;

const naWeb = () => Platform.OS === "web" && typeof window !== "undefined";

/**
 * Devolve a função que mantém o histórico em dia com a pilha de navegação.
 *
 * Ela precisa ser chamada pelo `onReady` E pelo `onStateChange` do
 * NavigationContainer — e não de um `useEffect` daqui — porque só o container
 * sabe dizer quando a referência passou a existir. Tentar adivinhar esse
 * momento por efeito foi exatamente o que não funcionou: o efeito rodava com
 * a referência ainda vazia e o ouvinte nunca era anexado.
 */
export function useVoltarDoNavegador(navigationRef: Ref): () => void {
  const sentinelaNoTopo = useRef(false);
  // O `history.back()` que NÓS chamamos para retirar a sentinela também
  // dispara popstate; esta bandeira faz esse disparo ser ignorado.
  const ignorarProximo = useRef(false);

  const podeVoltar = useCallback(
    () => Boolean(navigationRef.current?.canGoBack()),
    [navigationRef]
  );

  const sincronizar = useCallback(() => {
    if (!naWeb()) return;

    // Um F5 numa tela profunda recarrega a página COM a entrada sentinela
    // ainda no histórico, enquanto nosso controle em memória nasce zerado.
    // Sem reconhecê-la aqui, ela ficaria órfã e o primeiro Voltar seria uma
    // batida sem efeito nenhum.
    if (!sentinelaNoTopo.current && window.history.state?.[CHAVE]) {
      sentinelaNoTopo.current = true;
    }

    if (podeVoltar()) {
      if (sentinelaNoTopo.current) return;
      window.history.pushState({ [CHAVE]: true }, "");
      sentinelaNoTopo.current = true;
    } else {
      // Voltar pelo cabeçalho até a raiz deixaria uma sentinela órfã, e o
      // próximo Voltar seria uma batida silenciosa, sem nada na tela.
      if (!sentinelaNoTopo.current) return;
      sentinelaNoTopo.current = false;
      ignorarProximo.current = true;
      window.history.back();
    }
  }, [podeVoltar]);

  useEffect(() => {
    if (!naWeb()) return;

    const aoVoltar = () => {
      if (ignorarProximo.current) {
        ignorarProximo.current = false;
        return;
      }
      sentinelaNoTopo.current = false;
      if (podeVoltar()) {
        // A sentinela é reposta pelo `onStateChange` que este goBack dispara.
        navigationRef.current?.goBack();
      }
      // Sem para onde voltar, deixamos o navegador seguir: a pessoa sai do
      // app, que é o que ela pediu.
    };

    window.addEventListener("popstate", aoVoltar);
    return () => window.removeEventListener("popstate", aoVoltar);
  }, [navigationRef, podeVoltar]);

  return sincronizar;
}
