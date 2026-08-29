import { supabase } from "@/integrations/supabase/client";

export const PROOF_BUCKET = "ticket-proofs";
export const MAX_PROOF_FILES = 5;
export const MAX_PROOF_SIZE = 5 * 1024 * 1024; // 5 MB
export const ALLOWED_PROOF_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "application/pdf",
];
export const PROOF_ACCEPT = ".png,.jpg,.jpeg,.webp,.gif,.pdf";

export type ProofAttachment = {
  path: string;
  name: string;
  size: number;
  type: string;
};

export function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/** Validates a candidate file list. Returns human-readable errors, never throws. */
export function validateProofFiles(
  incoming: File[],
  existing: File[] = [],
): { accepted: File[]; errors: string[] } {
  const errors: string[] = [];
  const accepted: File[] = [];

  for (const file of incoming) {
    if (!ALLOWED_PROOF_TYPES.includes(file.type)) {
      errors.push(`${file.name}: unsupported file type. Allowed: PNG, JPG, WEBP, GIF or PDF.`);
      continue;
    }
    if (file.size > MAX_PROOF_SIZE) {
      errors.push(`${file.name}: ${formatBytes(file.size)} is too large. Maximum size is 5 MB per file.`);
      continue;
    }
    if (file.size === 0) {
      errors.push(`${file.name}: file is empty.`);
      continue;
    }
    if ([...existing, ...accepted].some((f) => f.name === file.name && f.size === file.size)) {
      errors.push(`${file.name}: already added.`);
      continue;
    }
    if (existing.length + accepted.length >= MAX_PROOF_FILES) {
      errors.push(`You can attach at most ${MAX_PROOF_FILES} files.`);
      break;
    }
    accepted.push(file);
  }

  return { accepted, errors };
}

function safeName(name: string) {
  return name.replace(/[^a-zA-Z0-9._-]/g, "_").slice(-80);
}

/** Uploads validated proof files and returns attachment metadata for the ticket row. */
export async function uploadProofFiles(
  userId: string,
  files: File[],
): Promise<ProofAttachment[]> {
  if (!files.length) return [];
  const folder = `${userId}/${crypto.randomUUID()}`;
  const uploaded: ProofAttachment[] = [];

  for (const file of files) {
    const path = `${folder}/${Date.now()}-${safeName(file.name)}`;
    const { error } = await supabase.storage
      .from(PROOF_BUCKET)
      .upload(path, file, { contentType: file.type, upsert: false });

    if (error) {
      throw new Error(`Could not upload ${file.name}: ${error.message}`);
    }
    uploaded.push({ path, name: file.name, size: file.size, type: file.type });
  }

  return uploaded;
}

/** Short-lived signed URL so a user (or admin) can open a stored proof file. */
export async function getProofUrl(path: string) {
  const { data, error } = await supabase.storage
    .from(PROOF_BUCKET)
    .createSignedUrl(path, 60 * 10);
  if (error) throw new Error(error.message);
  return data.signedUrl;
}
