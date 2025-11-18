import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { fromNodeHeaders } from 'better-auth/node';
import { auth } from './better-auth.config';

@Injectable()
export class SessionGuard implements CanActivate {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const sessionResult = await auth.api
      .getSession({
        headers: fromNodeHeaders(request.headers),
      })
      .catch(() => null);

    if (!sessionResult?.session || !sessionResult?.user) {
      throw new UnauthorizedException('Unauthorized');
    }

    request.session = sessionResult.session;
    request.user = sessionResult.user;

    return true;
  }
}
