import { SetMetadata } from '@nestjs/common';

export const BRANCH_SCOPE_KEY = 'branchScope';

export type BranchScopeSource = 'param' | 'query' | 'body';

export interface BranchScopeOptions {
  /** Où lire l'identifiant de branche visé dans la requête. */
  source: BranchScopeSource;
  /** Nom du champ (ex. "branchId"). */
  field?: string;
  /** Si true, l'absence de branchId est acceptée (ex. recherche réseau). */
  optional?: boolean;
}

/**
 * Exige que la branche visée par la requête fasse partie des branches
 * autorisées pour le rôle actif de l'utilisateur (BranchScopeGuard).
 */
export const BranchScope = (options: BranchScopeOptions = { source: 'param', field: 'branchId' }) =>
  SetMetadata(BRANCH_SCOPE_KEY, { field: 'branchId', ...options });
