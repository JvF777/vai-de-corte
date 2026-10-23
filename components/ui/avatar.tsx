/** Foto do barbeiro ou a inicial do nome sobre o dourado discreto. */
export function Avatar({ nome, url, tamanho = "md" }: { nome: string; url: string | null; tamanho?: "md" | "lg" }) {
  const classe = tamanho === "lg" ? "size-20 text-[1.75rem]" : "size-10 text-base";
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element -- imagem do Storage da barbearia
    return <img src={url} alt="" className={`${classe} shrink-0 rounded-full object-cover`} />;
  }
  return (
    <span aria-hidden className={`${classe} flex shrink-0 items-center justify-center rounded-full border border-ouro-discreto bg-ouro/10 font-titulo font-semibold text-ouro-hover`}>
      {nome.trim().charAt(0).toUpperCase()}
    </span>
  );
}
