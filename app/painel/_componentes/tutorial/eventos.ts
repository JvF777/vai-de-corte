/** Abre o passo a passo do painel (botão "Ver tutorial"). */
export const EVENTO_TUTORIAL = "vai-de-corte:tutorial";

/** Pede para o menu ☰ do celular abrir ou fechar: detail = { aberto: boolean }. */
export const EVENTO_MENU = "vai-de-corte:menu";

export function abrirTutorial() {
  window.dispatchEvent(new Event(EVENTO_TUTORIAL));
}

export function pedirMenu(aberto: boolean) {
  window.dispatchEvent(new CustomEvent(EVENTO_MENU, { detail: { aberto } }));
}

/** Liga o cliente de exemplo na agenda vazia: detail = { ativo: boolean }. */
export const EVENTO_EXEMPLO = "vai-de-corte:tutorial-exemplo";

/** Guardado aqui também porque a agenda pode montar depois do pedido (troca de página). */
export let exemploLigado = false;

export function pedirExemplo(ativo: boolean) {
  exemploLigado = ativo;
  window.dispatchEvent(new CustomEvent(EVENTO_EXEMPLO, { detail: { ativo } }));
}
