export const Role = {
  MEMBER: "MEMBER",
  COACH: "COACH",
  STAFF: "STAFF",
  ADMIN: "ADMIN",
} as const;

export type Role = (typeof Role)[keyof typeof Role];

export const ALL_ROLES: Role[] = [Role.MEMBER, Role.COACH, Role.STAFF, Role.ADMIN];
