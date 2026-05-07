import { createParamDecorator, ExecutionContext } from '@nestjs/common';

export interface CurrentUserPayload {
  userId: string;
  tenantId: string;
  username: string;
  roles: string[];
  permissions: string[];
  departmentId: string | null;
}

export const CurrentUser = createParamDecorator(
  (data: keyof CurrentUserPayload | undefined, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    const user = request.user as CurrentUserPayload;
    return data ? user?.[data] : user;
  },
);
