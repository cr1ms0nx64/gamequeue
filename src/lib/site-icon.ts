import sharp from 'sharp';
export const MAX_ICON_BYTES = 512 * 1024;
export const ICON_ERROR = 'Bitte ein gültiges PNG, JPEG oder WebP mit maximal 512 KB und 16 Megapixeln auswählen.';
export async function normalizeSiteIcon(base64: string): Promise<Buffer> {
  try {
    if (!base64 || base64.length > Math.ceil(MAX_ICON_BYTES / 3) * 4 || base64.length % 4 || !/^[A-Za-z0-9+/]+={0,2}$/.test(base64)) throw new Error();
    const input = Buffer.from(base64, 'base64');
    if (input.length > MAX_ICON_BYTES || input.toString('base64') !== base64) throw new Error();
    const png = input.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
    const jpeg = input[0] === 255 && input[1] === 216 && input[2] === 255;
    const webp = input.subarray(0,4).toString() === 'RIFF' && input.subarray(8,12).toString() === 'WEBP';
    if (!png && !jpeg && !webp) throw new Error();
    const image = sharp(input, { limitInputPixels: 16_000_000, failOn: 'warning' });
    const metadata = await image.metadata();
    if (!['png','jpeg','webp'].includes(metadata.format || '') || (metadata.pages || 1) > 1) throw new Error();
    return await image.rotate().resize(512,512,{ fit:'contain', background:{r:0,g:0,b:0,alpha:0} }).ensureAlpha().png({ compressionLevel:9 }).toBuffer();
  } catch { throw new Error(ICON_ERROR); }
}
export async function boundedJson(request: Request): Promise<unknown> {
  const limit = 768 * 1024;
  if (Number(request.headers.get('content-length')) > limit) throw new Error(ICON_ERROR);
  const reader = request.body?.getReader();
  if (!reader) throw new Error('Invalid body');
  const parts: Uint8Array[] = []; let length = 0;
  try {
    while (true) {
      const {done,value} = await reader.read();
      if (done) break;
      length += value.byteLength;
      if (length > limit) { await reader.cancel(); throw new Error(ICON_ERROR); }
      parts.push(value);
    }
    return JSON.parse(Buffer.concat(parts).toString('utf8'));
  } finally { reader.releaseLock(); }
}
