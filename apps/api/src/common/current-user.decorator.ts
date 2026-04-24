import { createParamDecorator, ExecutionContext } from "@nestjs/common";

import type { AuthenticatedUser } from "./authenticated-user.interface";

export const CurrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser | undefined => {
    const request = context.switchToHttp().getRequest();
    return request.user as AuthenticatedUser | undefined;
  },
);
