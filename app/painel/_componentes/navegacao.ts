import { CalendarDays, LayoutDashboard, Scissors, Settings, UserRound, Users } from "lucide-react";

export type ItemNavegacao = {
  rotulo: string;
  href: string;
  Icone: typeof LayoutDashboard;
  /** Ainda não existe: aparece desabilitado com "Em breve". */
  emBreve?: boolean;
};

export const NAVEGACAO: ItemNavegacao[] = [
  { rotulo: "Visão geral", href: "/painel", Icone: LayoutDashboard },
  { rotulo: "Agenda", href: "/painel/agenda", Icone: CalendarDays, emBreve: true },
  { rotulo: "Clientes", href: "/painel/clientes", Icone: Users, emBreve: true },
  { rotulo: "Serviços", href: "/painel/servicos", Icone: Scissors, emBreve: true },
  { rotulo: "Barbeiros", href: "/painel/barbeiros", Icone: UserRound, emBreve: true },
  { rotulo: "Barbearia", href: "/painel/barbearia", Icone: Settings, emBreve: true },
];
