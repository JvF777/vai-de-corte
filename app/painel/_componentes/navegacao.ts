import { CalendarDays, LayoutDashboard, Scissors, Settings, UserRound, Users } from "lucide-react";

export type ItemNavegacao = {
  rotulo: string;
  href: string;
  Icone: typeof LayoutDashboard;
  /** Ainda não existe: aparece desabilitado com "Em breve". */
  emBreve?: boolean;
  /** Cadastros que só o dono edita: o barbeiro não vê o item. */
  soDono?: boolean;
};

export const NAVEGACAO: ItemNavegacao[] = [
  { rotulo: "Visão geral", href: "/painel", Icone: LayoutDashboard },
  { rotulo: "Agenda", href: "/painel/agenda", Icone: CalendarDays },
  { rotulo: "Serviços", href: "/painel/servicos", Icone: Scissors, soDono: true },
  { rotulo: "Barbeiros", href: "/painel/barbeiros", Icone: UserRound, soDono: true },
  { rotulo: "Barbearia", href: "/painel/barbearia", Icone: Settings, soDono: true },
  { rotulo: "Clientes", href: "/painel/clientes", Icone: Users, emBreve: true },
];
