import { Aviso } from "@/components/ui/aviso";

/** Mensagem para quem não é dono e chega numa tela de cadastro. */
export function SoDono({ titulo }: { titulo: string }) {
  return (
    <div className="flex flex-col gap-6">
      <h1 className="font-titulo text-titulo font-bold">{titulo}</h1>
      <Aviso tipo="info" titulo="Só o dono da barbearia mexe aqui">
        Se precisar mudar alguma coisa, fale com o dono. A sua agenda continua em Agenda.
      </Aviso>
    </div>
  );
}

/** Esqueleto de uma tela de cadastro enquanto os dados chegam. */
export function CarregandoCadastro({ rotulo }: { rotulo: string }) {
  return (
    <div className="flex flex-col gap-6" aria-busy="true" aria-label={rotulo}>
      <div className="flex items-end justify-between gap-4">
        <div>
          <div className="h-9 w-40 rounded-sm bg-elevado" />
          <div className="mt-3 h-5 w-80 max-w-full rounded-sm bg-card" />
        </div>
        <div className="hidden h-11 w-40 rounded-sm bg-elevado sm:block" />
      </div>
      <div className="h-80 rounded-md border border-borda bg-card" />
    </div>
  );
}
