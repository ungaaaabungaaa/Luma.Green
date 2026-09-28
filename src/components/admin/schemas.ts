import { z } from "zod";

import { ageOn } from "../../../convex/lib/admin";
import { normalizeIndianMobile } from "../../../convex/lib/phone";

/**
 * The admin's identity record. The same rules run again in Convex
 * (`validateAdminProfile`), which is the one that counts.
 */
export const adminProfileSchema = z.object({
  name: z
    .string()
    .trim()
    .min(2, "Enter your full name.")
    .max(80, "Use at most 80 characters."),
  phone: z
    .string()
    .refine(
      (value) => normalizeIndianMobile(value) !== null,
      "Enter a 10-digit Indian mobile number.",
    ),
  dateOfBirth: z.string().superRefine((value, ctx) => {
    const age = ageOn(value, new Date());
    if (age === null || age > 120) {
      ctx.addIssue({ code: "custom", message: "Enter your date of birth." });
    } else if (age < 18) {
      ctx.addIssue({
        code: "custom",
        message: "The admin must be 18 or older.",
      });
    }
  }),
  aadhaarLast4: z
    .string()
    .regex(/^\d{4}$/, "Enter the last four digits — nothing more."),
});

export type AdminProfileValues = z.infer<typeof adminProfileSchema>;

export const adminAccountSchema = adminProfileSchema
  .extend({
    email: z.email("Enter an email address."),
    password: z
      .string()
      .min(12, "Use at least 12 characters.")
      .max(128, "Use at most 128 characters."),
    confirmPassword: z.string(),
  })
  .refine((values) => values.password === values.confirmPassword, {
    path: ["confirmPassword"],
    message: "The passwords don't match.",
  });

export type AdminAccountValues = z.infer<typeof adminAccountSchema>;

export const adminSignInSchema = z.object({
  email: z.email("Enter an email address."),
  password: z.string().min(1, "Enter your password."),
});

export type AdminSignInValues = z.infer<typeof adminSignInSchema>;
