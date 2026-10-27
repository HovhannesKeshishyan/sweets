import {
  createCloudinaryStorage,
  MAX_UPLOAD_BYTES,
  validateImageFile,
} from "../../services/upload.service";

/** Multipart image upload (field "file") to the configured storage provider. */
export default defineEventHandler(async (event) => {
  await requireAdmin(event);

  const { cloudinary } = useRuntimeConfig();
  if (!cloudinary.cloudName || !cloudinary.apiKey || !cloudinary.apiSecret) {
    throw createError({
      statusCode: 501,
      statusMessage:
        "Image uploads are not configured. Paste an image URL instead, or set the Cloudinary variables.",
    });
  }

  const length = Number(getHeader(event, "content-length") ?? 0);
  if (length > MAX_UPLOAD_BYTES + 64 * 1024)
    throw createError({
      statusCode: 413,
      statusMessage: "Images must be 4 MB or smaller",
    });

  const parts = await readMultipartFormData(event);
  const file = parts?.find((p) => p.name === "file" && p.filename);
  if (!file)
    throw createError({
      statusCode: 422,
      statusMessage: "Choose an image to upload",
    });

  const mimeType = validateImageFile(file.data);
  const storage = createCloudinaryStorage(cloudinary);
  return storage.upload({
    data: file.data,
    mimeType,
    filename: file.filename ?? "image",
  });
});
