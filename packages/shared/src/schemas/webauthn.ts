import { z } from 'zod';

// RegistrationResponseJSON / AuthenticationResponseJSON are validated
// structurally by @simplewebauthn/server. We only validate the wrapper.
export const passkeyRegisterVerifySchema = z.object({
  response: z.record(z.unknown()),
  name: z.string().max(50).optional(),
});

export const passkeyAuthVerifySchema = z.object({
  response: z.record(z.unknown()),
});

export type PasskeyRegisterVerifyInput = z.infer<typeof passkeyRegisterVerifySchema>;
export type PasskeyAuthVerifyInput = z.infer<typeof passkeyAuthVerifySchema>;

// Passkey-only signup (no password, no email). The credential IS the account;
// displayName is the only thing the user types, and it is required — it becomes
// both users.display_name and the WebAuthn userName the OS passkey manager
// lists the account under, which cannot be renamed from the app afterwards.
//
// .trim() runs before .min(1) (Zod applies transforms and checks in order), so
// a whitespace-only name is rejected rather than stored blank.
export const passkeySignupOptionsSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, '表示名を入力してください')
    .max(50, '表示名は50文字以内で入力してください'),
});

export const passkeySignupVerifySchema = z.object({
  response: z.record(z.unknown()),
  name: z.string().max(50).optional(),
});

export type PasskeySignupOptionsInput = z.infer<typeof passkeySignupOptionsSchema>;
export type PasskeySignupVerifyInput = z.infer<typeof passkeySignupVerifySchema>;
