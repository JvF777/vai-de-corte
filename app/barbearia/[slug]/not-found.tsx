import { LinkBotao } from "@/components/ui/botao";

export default function NaoEncontrada() {
  return (
    <main className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center px-4 py-20 sm:px-8">
      <h1 className="font-titulo text-titulo font-bold">Link não encontrado</h1>
      <p className="mt-3 text-[1.0625rem] text-texto-sec">
        Confira se o endereço está escrito igual ao que a barbearia passou. Se o link veio do Instagram ou de um QR Code,
        peça um novo para a barbearia.
      </p>
      <LinkBotao href="/" variante="secundario" className="mt-8 self-start">
        Ir para o início
      </LinkBotao>
    </main>
  );
}
