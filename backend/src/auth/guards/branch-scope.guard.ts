import { ForbiddenException, Injectable, type CanActivate, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { BRANCH_SCOPE_KEY, type BranchScopeOptions } from '../decorators/branch-scope.decorator.js';
import type { AuthenticatedUser } from '../types/authenticated-user.js';

@Injectable()
export class BranchScopeGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const options = this.reflector.getAllAndOverride<BranchScopeOptions | undefined>(BRANCH_SCOPE_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as AuthenticatedUser | undefined;
    if (!user) {
      throw new ForbiddenException('BRANCH_NOT_AUTHORIZED');
    }

    const field = options.field ?? 'branchId';
    const targetBranchId: string | undefined =
      options.source === 'param'
        ? request.params?.[field]
        : options.source === 'query'
          ? request.query?.[field]
          : request.body?.[field];

    if (!targetBranchId) {
      if (options.optional) {
        return true;
      }
      throw new ForbiddenException('BRANCH_NOT_AUTHORIZED');
    }

    const hasNetworkScope = user.grants.some(
      (g) => g.role === user.activeRole && g.branchId === null,
    );
    if (hasNetworkScope) {
      return true;
    }

    const hasBranchScope = user.grants.some(
      (g) => g.role === user.activeRole && g.branchId === targetBranchId,
    );
    if (!hasBranchScope) {
      throw new ForbiddenException('BRANCH_NOT_AUTHORIZED');
    }

    return true;
  }
}
