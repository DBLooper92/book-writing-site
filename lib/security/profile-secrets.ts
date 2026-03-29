import { createCipheriv, createDecipheriv, createHash, randomBytes } from "crypto";

const ENCRYPTION_ALGORITHM = "aes-256-gcm";
const IV_LENGTH = 12;
const CURRENT_VERSION = "v1";

export function encryptProfileSecret(value: string) {
  const normalized = value.trim();

  if (!normalized) {
    throw new Error("Secret value is required.");
  }

  const iv = randomBytes(IV_LENGTH);
  const cipher = createCipheriv(ENCRYPTION_ALGORITHM, readEncryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(normalized, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();

  return [CURRENT_VERSION, iv.toString("base64"), encrypted.toString("base64"), authTag.toString("base64")].join(".");
}

export function decryptProfileSecret(value: string) {
  const parts = value.split(".");

  if (parts.length !== 4 || parts[0] !== CURRENT_VERSION) {
    throw new Error("Stored secret format is invalid.");
  }

  const [, ivBase64, encryptedBase64, authTagBase64] = parts;
  const decipher = createDecipheriv(
    ENCRYPTION_ALGORITHM,
    readEncryptionKey(),
    Buffer.from(ivBase64, "base64")
  );

  decipher.setAuthTag(Buffer.from(authTagBase64, "base64"));

  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(encryptedBase64, "base64")),
    decipher.final(),
  ]);

  return decrypted.toString("utf8");
}

export function readSecretLast4(value: string) {
  const normalized = value.trim();
  return normalized.length >= 4 ? normalized.slice(-4) : normalized;
}

function readEncryptionKey() {
  const secret = process.env.PROFILE_SECRETS_ENCRYPTION_KEY?.trim();

  if (!secret) {
    throw new Error("PROFILE_SECRETS_ENCRYPTION_KEY is not configured on the server.");
  }

  return createHash("sha256").update(secret, "utf8").digest();
}
