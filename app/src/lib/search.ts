// Normalização usada pela busca da agenda.
//
// Além de caixa e espaços, tira os acentos: em português quase ninguém digita
// "Inteligência" com o acento na pressa, e uma busca que exige isso pareceria
// quebrada. `NFD` separa a letra do diacrítico e o replace remove apenas os
// diacríticos (̀–ͯ), preservando todo o resto.
export function normalizarTexto(valor: string): string {
  return valor
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .trim();
}
