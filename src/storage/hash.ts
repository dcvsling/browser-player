import crypto from 'crypto';

declare global {
  interface String {
    hash(seed?: string): string;
  }
}


function createHashString(this: ThisType<string>, seed: string = ''): string {
  return crypto.createHash('sha256').update(this + seed).digest('base64');
};


String.prototype.hash = createHashString;
