const MAX_CLOCK_SKEW_SECONDS = 5 * 60;

const keyCache = new Map<string, Promise<CryptoKey>>();

function hexToBytes(hex: string) {
  if (!/^[0-9a-fA-F]*$/.test(hex) || hex.length % 2 !== 0) {
    return null;
  }
  const bytes = new Uint8Array(hex.length / 2);
  for (let index = 0; index < bytes.length; index += 1) {
    bytes[index] = Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16);
  }
  return bytes;
}

function importPublicKey(publicKeyHex: string) {
  let key = keyCache.get(publicKeyHex);
  if (!key) {
    const bytes = hexToBytes(publicKeyHex);
    if (!bytes || bytes.length !== 32) {
      return Promise.reject(new Error("DISCORD_PUBLIC_KEY must be a 64-character hex string"));
    }
    key = crypto.subtle.importKey("raw", bytes, { name: "Ed25519" }, false, ["verify"]);
    keyCache.set(publicKeyHex, key);
  }
  return key;
}

/**
 * Verifies Discord's Ed25519 request signature over `timestamp + body`.
 * https://discord.com/developers/docs/interactions/overview#setting-up-an-endpoint-validating-security-request-headers
 */
export async function verifyDiscordSignature(options: {
  publicKey: string;
  signature: string | undefined;
  timestamp: string | undefined;
  body: string;
  nowSeconds?: number;
}) {
  const { signature, timestamp, body } = options;
  if (!options.publicKey || !signature || !timestamp) {
    return false;
  }

  const sentAt = Number(timestamp);
  const now = options.nowSeconds ?? Math.floor(Date.now() / 1000);
  if (!Number.isFinite(sentAt) || Math.abs(now - sentAt) > MAX_CLOCK_SKEW_SECONDS) {
    return false;
  }

  const signatureBytes = hexToBytes(signature);
  if (!signatureBytes || signatureBytes.length !== 64) {
    return false;
  }

  try {
    const key = await importPublicKey(options.publicKey);
    return await crypto.subtle.verify(
      "Ed25519",
      key,
      signatureBytes,
      new TextEncoder().encode(timestamp + body),
    );
  } catch {
    return false;
  }
}
