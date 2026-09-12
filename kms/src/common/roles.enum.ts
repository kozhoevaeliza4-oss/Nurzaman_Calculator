// Section 2 of the TZ: role list and access scopes. v3.0 adds three
// school-only roles (see common/direction.enum.ts) - TEACHER stays the
// Kids-direction "воспитатель", the new roles are Школа-only.
export enum Role {
  DIRECTOR = 'director',
  ADMIN = 'admin',
  ACCOUNTANT = 'accountant',
  TEACHER = 'teacher',
  MEDIC = 'medic',
  PARENT = 'parent',
  DEPUTY_HEAD = 'deputy_head',
  HOMEROOM_TEACHER = 'homeroom_teacher',
  SUBJECT_TEACHER = 'subject_teacher',
}

// Roles whose access is pinned to one direction regardless of any
// per-user `direction` field - a homeroom/subject teacher or deputy head
// is Школа by definition, TEACHER (воспитатель) is Кидс by definition.
export const FIXED_DIRECTION_ROLES: Partial<Record<Role, 'kids' | 'school'>> = {
  [Role.TEACHER]: 'kids',
  [Role.DEPUTY_HEAD]: 'school',
  [Role.HOMEROOM_TEACHER]: 'school',
  [Role.SUBJECT_TEACHER]: 'school',
};
