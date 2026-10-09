import { z } from "zod";

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
