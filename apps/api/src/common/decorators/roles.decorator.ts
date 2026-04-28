import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from './roles.decorator.constants';
import { MembershipRole } from '@prisma/client';

export { ROLES_KEY };

export const Roles = (...roles: MembershipRole[]) =>
  SetMetadata(ROLES_KEY, roles);
