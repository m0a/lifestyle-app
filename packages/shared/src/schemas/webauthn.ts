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
