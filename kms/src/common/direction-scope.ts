import { Direction } from './direction.enum';
import { FIXED_DIRECTION_ROLES, Role } from './roles.enum';
import { AuthUser } from './current-user.decorator';

// null = both directions (director, and accountant/medic who span both per
// section 2 of the ТЗ v3.0 role table, and admin when not pinned to one).
export function effectiveDirections(user: AuthUser): Direction[] | null {
  const fixed = FIXED_DIRECTION_ROLES[user.role as Role];
  if (fixed) return [fixed as Direction];
  if (user.role === Role.ADMIN && user.direction) return [user.direction as Direction];
  return null;
}

// A single requested/target direction against what the user may see -
// throws-friendly: returns false rather than throwing so callers can pick
// NotFoundException vs ForbiddenException as fits the endpoint.
export function canAccessDirection(user: AuthUser, direction: Direction): boolean {
  const allowed = effectiveDirections(user);
  return allowed === null || allowed.includes(direction);
}
