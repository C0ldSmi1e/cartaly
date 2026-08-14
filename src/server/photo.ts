import "server-only";
import sharp from "sharp";
import { menuLimits } from "@/src/config/constants";
import { BadRequestError } from "@/src/server/errors";

// Canonical bytes for hashing: orientation applied, ≤2048px, EXIF stripped.
const normalizePhoto = async (input: Uint8Array): Promise<Buffer> => {
  try {
    return await sharp(input)
      .rotate()
      .resize({
        width: menuLimits.maxImageDim,
        height: menuLimits.maxImageDim,
        fit: "inside",
        withoutEnlargement: true,
      })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch {
    throw new BadRequestError("That file doesn't look like a readable image");
  }
};

export { normalizePhoto };
