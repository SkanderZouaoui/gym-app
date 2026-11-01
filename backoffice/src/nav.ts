import type { WebRole } from './store/auth'

export interface NavItem {
  to: string
  label: string
  icon: string
  /** Rôles qui voient l'entrée ; tous par défaut. */
  roles?: WebRole[]
}
export interface NavGroup {
  title?: string
  items: NavItem[]
}

/** Entrées du menu. Même découpage que l'application : accueil et équipe d'un côté, administration de l'autre. */
export const NAV: NavGroup[] = [
  {
    items: [
      { to: '/', label: 'Accueil', icon: 'home' },
      { to: '/members', label: 'Adhérents', icon: 'groups' },
      { to: '/cash', label: 'Caisse', icon: 'payments' },
      { to: '/planning', label: 'Planning', icon: 'calendar_month' },
    ],
  },
  {
    title: 'Administration',
    items: [
      { to: '/plans', label: 'Abonnements', icon: 'card_membership', roles: ['ADMIN'] },
      { to: '/programs', label: 'Programmes', icon: 'fact_check', roles: ['ADMIN'] },
      { to: '/communication', label: 'Communication', icon: 'campaign', roles: ['ADMIN'] },
      { to: '/catalog', label: 'Cours et salles', icon: 'exercise', roles: ['ADMIN'] },
      { to: '/team', label: 'Équipe', icon: 'badge', roles: ['ADMIN'] },
      { to: '/settings', label: 'Réglages', icon: 'settings', roles: ['ADMIN'] },
    ],
  },
]

export function navFor(role: WebRole | null): NavGroup[] {
  return NAV.map((g) => ({ ...g, items: g.items.filter((i) => !i.roles || (role && i.roles.includes(role))) })).filter((g) => g.items.length > 0)
}
