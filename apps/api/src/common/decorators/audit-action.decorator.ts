import { SetMetadata } from '@nestjs/common';

export const AUDIT_ACTION_KEY = 'audit_action';
export const AUDIT_ENTITY_KEY = 'audit_entity';

export const AuditAction = (action: string, entity: string) =>
  SetMetadata(AUDIT_ACTION_KEY, { action, entity });
