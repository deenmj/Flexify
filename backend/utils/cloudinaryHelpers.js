// backend/utils/cloudinaryHelpers.js
import cloudinary from "./cloudinary.js";

/**
 * Deletes multiple images from Cloudinary by their public_ids.
 * Uses Promise.allSettled so individual failures never block cleanup.
 * Always logs errors for observability.
 *
 * @param {string[]} publicIds  Array of Cloudinary public_ids to destroy
 * @returns {Promise<{ deleted: string[], failed: string[] }>}
 */
export const deleteCloudinaryImages = async (publicIds = []) => {
  const deleted = [];
  const failed = [];

  if (!publicIds || publicIds.length === 0) return { deleted, failed };

  await Promise.allSettled(
    publicIds.map(async (publicId) => {
      try {
        await cloudinary.uploader.destroy(publicId);
        deleted.push(publicId);
      } catch (err) {
        console.error(`[Cloudinary] Failed to delete image "${publicId}":`, err?.message || err);
        failed.push(publicId);
      }
    })
  );

  if (failed.length > 0) {
    console.warn(
      `[Cloudinary] Cleanup warning: ${failed.length} image(s) could not be deleted:`,
      failed
    );
  }

  return { deleted, failed };
};

/**
 * Extracts public_ids from an array of multer-cloudinary file objects.
 * multer-storage-cloudinary stores the Cloudinary public_id in `file.filename`.
 *
 * @param {Express.Multer.File[]} files
 * @returns {string[]}
 */
export const extractPublicIds = (files = []) =>
  (files || []).map((f) => f.filename).filter(Boolean);
