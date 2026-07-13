import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';

/** Ensures the authenticated user matches the :id route param (or is admin). */
@Injectable()
export class SelfOrAdminGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user = request.user;
    const paramId = request.params?.id;

    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.id === paramId) return true;

    throw new ForbiddenException('You can only perform this action on your own account');
  }
}
