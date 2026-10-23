"use client";

import { SEM_MOVIMENTO, gsap } from "./gsap";

const NS = "http://www.w3.org/2000/svg";

/** Tesoura dourada (SVG) que corre pela linha do corte. */
function criarTesoura() {
  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "-20 -14 50 28");
  svg.setAttribute("width", "64");
  svg.setAttribute("height", "36");
  svg.setAttribute("aria-hidden", "true");
  svg.style.cssText = "position:absolute;left:0;top:0;overflow:visible;color:var(--color-ouro)";
  svg.innerHTML = `
    <g data-lamina="cima">
      <path d="M0 -1.6 L26 -0.2 L26 0.6 L0 1.6 Z" fill="currentColor"/>
      <path d="M0 0 L-8 5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="-12.5" cy="8" r="4.8" fill="none" stroke="currentColor" stroke-width="2.2"/>
    </g>
    <g data-lamina="baixo">
      <path d="M0 -1.6 L26 -0.6 L26 0.2 L0 1.6 Z" fill="currentColor"/>
      <path d="M0 0 L-8 -5" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"/>
      <circle cx="-12.5" cy="-8" r="4.8" fill="none" stroke="currentColor" stroke-width="2.2"/>
    </g>
    <circle r="1.8" fill="var(--color-fundo)" stroke="currentColor" stroke-width="1"/>`;
  return svg;
}

/** Cópia estática do que está na tela, com os valores digitados nos campos. */
function copiarTela(origem: HTMLElement) {
  const copia = origem.cloneNode(true) as HTMLElement;
  const camposOrigem = origem.querySelectorAll("input, textarea, select");
  copia.querySelectorAll<HTMLInputElement>("input, textarea, select").forEach((campo, i) => {
    const original = camposOrigem[i] as HTMLInputElement;
    if (original) {
      campo.value = original.value;
      campo.checked = original.checked;
    }
  });
  copia.removeAttribute("id");
  copia.style.cssText = `position:absolute;left:0;top:${-window.scrollY}px;width:${document.documentElement.clientWidth}px;margin:0`;
  return copia;
}

const esperar = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Corta a tela atual ao meio com uma tesoura e abre as duas metades,
 * mostrando a próxima página por baixo.
 *
 * `navegar` troca a página real (por baixo das metades); `pronta` diz quando
 * a próxima página já está na tela. Com "reduzir movimento", só navega.
 */
export async function cortarPagina(origem: HTMLElement, navegar: () => void, pronta: () => boolean) {
  if (window.matchMedia(SEM_MOVIMENTO).matches) {
    navegar();
    return;
  }

  const largura = document.documentElement.clientWidth;
  const altura = window.innerHeight;
  // Linha do corte levemente inclinada, passando pelo meio da tela.
  const yEsq = altura * 0.54;
  const yDir = altura * 0.46;
  const pctEsq = (yEsq / altura) * 100;
  const pctDir = (yDir / altura) * 100;

  const camada = document.createElement("div");
  camada.setAttribute("aria-hidden", "true");
  // Bloqueia cliques na página antiga enquanto a nova carrega por baixo.
  camada.style.cssText = "position:fixed;inset:0;z-index:60;overflow:hidden";

  const metade = (clip: string) => {
    const el = document.createElement("div");
    el.style.cssText = `position:absolute;inset:0;overflow:hidden;background:var(--color-fundo);box-shadow:0 0 40px rgb(0 0 0 / 0.6);clip-path:${clip};will-change:transform`;
    el.appendChild(copiarTela(origem));
    camada.appendChild(el);
    return el;
  };
  const cima = metade(`polygon(0 0, 100% 0, 100% ${pctDir}%, 0 ${pctEsq}%)`);
  const baixo = metade(`polygon(0 ${pctEsq}%, 100% ${pctDir}%, 100% 100%, 0 100%)`);

  // O traço dourado que a tesoura deixa.
  const angulo = (Math.atan2(yDir - yEsq, largura) * 180) / Math.PI;
  const comprimento = Math.hypot(largura, yDir - yEsq);
  const traco = document.createElement("div");
  traco.style.cssText = `position:absolute;left:0;top:${yEsq}px;height:2px;width:${comprimento}px;margin-top:-1px;background:var(--color-ouro);transform-origin:0 50%;transform:rotate(${angulo}deg) scaleX(0)`;
  camada.appendChild(traco);

  const tesoura = criarTesoura();
  camada.appendChild(tesoura);
  document.body.appendChild(camada);

  const laminaCima = tesoura.querySelector("[data-lamina='cima']")!;
  const laminaBaixo = tesoura.querySelector("[data-lamina='baixo']")!;
  const estado = { p: 0, a: 24 };
  const desenhar = () => {
    const x = estado.p * (largura + 80) - 40;
    const y = yEsq + (yDir - yEsq) * (x / largura);
    tesoura.style.transform = `translate(${x - 32}px, ${y - 18}px) rotate(${angulo}deg)`;
    laminaCima.setAttribute("transform", `rotate(${-estado.a})`);
    laminaBaixo.setAttribute("transform", `rotate(${estado.a})`);
    traco.style.transform = `rotate(${angulo}deg) scaleX(${Math.min(1, Math.max(0, x / largura))})`;
  };
  desenhar();

  // A página nova carrega por baixo enquanto a tesoura corta.
  navegar();

  const cortes = Math.max(4, Math.round(largura / 220));
  const porCorte = 0.85 / cortes;
  const corte = gsap.timeline({ onUpdate: desenhar });
  corte.to(estado, { p: 1, duration: 0.85, ease: "power1.inOut" }, 0);
  for (let i = 0; i < cortes; i++) {
    corte
      .to(estado, { a: 2, duration: porCorte * 0.45, ease: "power2.in" }, i * porCorte)
      .to(estado, { a: 24, duration: porCorte * 0.55, ease: "power1.out" }, i * porCorte + porCorte * 0.45);
  }

  // Espera o corte terminar e a página nova aparecer (no máximo 5 s).
  await corte.then();
  for (let t = 0; t < 100 && !pronta(); t++) await esperar(50);
  await esperar(120);

  await gsap
    .timeline()
    .to(tesoura, { autoAlpha: 0, duration: 0.15 }, 0)
    .to(traco, { autoAlpha: 0, duration: 0.25 }, 0.1)
    // As metades se abrem por inteiro (sem esmaecer), como papel cortado.
    .to(cima, { yPercent: -100, rotation: -3, transformOrigin: "0% 100%", duration: 0.85, ease: "power3.inOut" }, 0.05)
    .to(baixo, { yPercent: 100, rotation: 3, transformOrigin: "100% 0%", duration: 0.85, ease: "power3.inOut" }, 0.05)
    .then();
  camada.remove();
}
