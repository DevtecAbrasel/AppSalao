// Service worker mínimo, com um único propósito: existir com um handler de
// `fetch`. É esse o critério que o Chrome exige para considerar o site
// instalável e disparar o `beforeinstallprompt` — sem ele, não há botão de
// instalar no Android.
//
// De propósito NÃO faz cache. O bundle do app carrega as variáveis
// EXPO_PUBLIC_* embutidas no momento do build, então guardar respostas aqui
// faria o app continuar servindo um bundle antigo (e uma URL de API antiga)
// depois de um deploy — o tipo de falha que só aparece no celular de quem já
// tinha aberto o site antes.
self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("fetch", () => {
  // Sem respondWith: a requisição segue para a rede como se não houvesse
  // service worker nenhum.
});
