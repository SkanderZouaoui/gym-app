import { useState } from 'react'

const DEFAULT_PAGE_SIZE = 10

/** Pagination côté client pour les tables du back-office. Si la liste
 * rétrécit (filtre, recherche) et que la page courante n'existe plus, on
 * retombe sur la dernière page valide plutôt que d'afficher une page vide. */
export function usePagination<T>(items: T[], pageSize = DEFAULT_PAGE_SIZE) {
  const [page, setPage] = useState(1)
  const pageCount = Math.max(1, Math.ceil(items.length / pageSize))
  const safePage = Math.min(page, pageCount)
  const pageItems = items.slice((safePage - 1) * pageSize, safePage * pageSize)

  return {
    page: safePage,
    pageCount,
    pageItems,
    setPage,
    totalItems: items.length,
    pageSize,
  }
}
