export const ATTACHMENT_IMAGE_BUCKET_ID = "entity-images";
export const ATTACHMENT_IMAGE_MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024;
export const ATTACHMENT_IMAGE_ALLOWED_MIME_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/gif",
  "image/avif",
] as const;

export const ATTACHMENT_DOCUMENT_BUCKET_ID = "project-documents";
export const ATTACHMENT_DOCUMENT_MAX_FILE_SIZE_BYTES = 25 * 1024 * 1024;
export const ATTACHMENT_DOCUMENT_ALLOWED_MIME_TYPES = [
  "text/plain",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
] as const;
