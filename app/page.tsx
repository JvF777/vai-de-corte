import Link from "next/link";
import { CalendarCheck, LogIn, MessageCircle, Scissors } from "lucide-react";

export default function PaginaInicial() {
  return (
    <main className="flex flex-1 flex-col items-center justify-center gap-8 px-4 py-16 text-center">
      <div className="flex items-center gap-2 text-lg font-semibold">
        <Scissors className="size-6" />
        Barbeiro SaaS
      </div>
      <div className="max-w-xl">
        <h1 className="text-3xl font-bold sm:text-4xl">
          Seu cliente agenda sozinho. Você para de responder mensagem.
        </h1>
        <p className="mt-4 text-zinc-600">
          Um link da sua barbearia com serviços, barbeiros e horários livres. O cliente escolhe e
          pronto: a agenda de cada barbeiro fica organizada no painel.
        </p>
      </div>
      <ul className="flex flex-col gap-2 text-sm text-zinc-700 sm:flex-row sm:gap-6">
        <li className="flex items-center gap-2">
          <CalendarCheck className="size-4" /> Agenda por barbeiro
        </li>
        <li className="flex items-center gap-2">
          <MessageCircle className="size-4" /> Lembrete pelo WhatsApp
        </li>
      </ul>
      <Link
        href="/painel"
        className="flex items-center gap-2 rounded-lg bg-zinc-900 px-5 py-3 font-semibold text-white hover:bg-zinc-700"
      >
        <LogIn className="size-5" />
        Entrar no painel
      </Link>
    </main>
  );
}
