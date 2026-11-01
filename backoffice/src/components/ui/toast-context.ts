import { createContext, useContext } from 'react'

export type ToastItem = { id: number; text: string; tone: 'success' | 'danger' }
export const ToastContext = createContext<(text: string, tone?: ToastItem['tone']) => void>(() => undefined)

/** Affiche une notification éphémère : `toast('Enregistré')` ou `toast('Erreur', 'danger')`. */
export const useToast = () => useContext(ToastContext)
