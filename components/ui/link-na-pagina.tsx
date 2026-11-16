"use client";

import type { ComponentProps, MouseEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

type Props = Omit<ComponentProps<typeof Link>, "href" | "prefetch"> & { href: string };

/**
 * Link que só troca o ?query= da mesma página (setas, "Hoje", Dia/Mês, filtros).
 *
 * Com o Partial Prefetching (next.config), um <Link> comum para a mesma rota
 * reaproveita a "casca" já carregada e às vezes não busca os dados novos:
 * o clique não muda nada. Aqui o clique vai pelo router.push (o mesmo caminho
 * do seletor de data, que funciona). O href continua lá para abrir em nova aba.
 */
export function LinkNaPagina({ href, onClick, ...resto }: Props) {
  const router = useRouter();

  function aoClicar(e: MouseEvent<HTMLAnchorElement>) {
    onClick?.(e);
    if (e.defaultPrevented) return;
    // Ctrl/Cmd/Shift/botão do meio: deixa o navegador abrir em outra aba.
    if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return;
    e.preventDefault();
    router.push(href, { scroll: false });
  }

  return <Link href={href} prefetch={false} onClick={aoClicar} {...resto} />;
}
