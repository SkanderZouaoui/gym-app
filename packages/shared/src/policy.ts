import { z } from "zod";

export const AccessScope = {
  INHERIT: "INHERIT",
  HOME_ONLY: "HOME_ONLY",
  ALL: "ALL",
  SELECTED: "SELECTED",
} as const;
export type AccessScope = (typeof AccessScope)[keyof typeof AccessScope];

export const CrossBranchBookingMode = {
  INHERIT: "INHERIT",
  DISABLED: "DISABLED",
  ENABLED: "ENABLED",
  LIMITED: "LIMITED",
} as const;
export type CrossBranchBookingMode = (typeof CrossBranchBookingMode)[keyof typeof CrossBranchBookingMode];

export const multiBranchPolicySchema = z.object({
  defaultAccessScope: z.enum(["HOME_ONLY", "ALL", "SELECTED"]),
  crossBranchBooking: z.object({
    mode: z.enum(["DISABLED", "ENABLED", "LIMITED"]),
    monthlyQuota: z.number().int().nonnegative().nullable(),
    bookingWindowHours: z.number().int().positive().nullable(),
  }),
});
export type MultiBranchPolicy = z.infer<typeof multiBranchPolicySchema>;

export const attendancePolicySchema = z.object({
  scanOpensMinutesBefore: z.number().int().nonnegative(),
  scanClosesMinutesAfterStart: z.number().int().nonnegative(),
  allowWalkIn: z.boolean(),
  noShowGraceMinutes: z.number().int().nonnegative(),
  noShowPenalty: z.object({
    enabled: z.boolean(),
    threshold: z.number().int().positive(),
    windowDays: z.number().int().positive(),
    blockBookingDays: z.number().int().positive(),
  }),
  staffCanRecordPayments: z.boolean(),
});
export type AttendancePolicy = z.infer<typeof attendancePolicySchema>;

export const DEFAULT_MULTI_BRANCH_POLICY: MultiBranchPolicy = {
  defaultAccessScope: "HOME_ONLY",
  crossBranchBooking: {
    mode: "LIMITED",
    monthlyQuota: 4,
    bookingWindowHours: 24,
  },
};

export const DEFAULT_ATTENDANCE_POLICY: AttendancePolicy = {
  scanOpensMinutesBefore: 15,
  scanClosesMinutesAfterStart: 10,
  allowWalkIn: false,
  noShowGraceMinutes: 15,
  noShowPenalty: {
    enabled: false,
    threshold: 3,
    windowDays: 30,
    blockBookingDays: 7,
  },
  staffCanRecordPayments: true,
};
