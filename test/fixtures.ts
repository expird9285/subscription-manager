// Test-only Ed25519 key pair used to sign fake Discord interaction requests.
export const TEST_DISCORD_PUBLIC_KEY = "92b63a012b5753e5bd0529dd47c185adf081118d66d9ff9011becab5175611e4";

export const TEST_DISCORD_PRIVATE_JWK = {
  kty: "OKP",
  crv: "Ed25519",
  d: "6gaemUjPfmvrR6B7ul_eLrmorE6Vqu8aYrMZKYT-OE0",
  x: "krY6AStXU-W9BSndR8GFrfCBEY1m2f-QEb7KtRdWEeQ",
} as const;

export const ALLOWED_ID = "111111111111111111";
export const SECOND_ALLOWED_ID = "333333333333333333";
export const BLOCKED_ID = "999999999999999999";
