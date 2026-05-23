import { createHmac, timingSafeEqual } from 'node:crypto';

export function verifyLeadtimeSignature(params: {
  rawBody: Buffer;
  signatureHeader: string | undefined;
  secret: string;
}) {
  if (!params.signatureHeader) return false;

  const expected = createHmac('sha256', params.secret)
    .update(params.rawBody)
    .digest('hex');
  const actual = params.signatureHeader.replace(/^sha256=/, '').trim();

  const expectedBuffer = Buffer.from(expected, 'hex');
  const actualBuffer = Buffer.from(actual, 'hex');
  if (expectedBuffer.length !== actualBuffer.length) return false;
  return timingSafeEqual(expectedBuffer, actualBuffer);
}
