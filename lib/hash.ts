import crypto from 'crypto';

/**
 * 사용자 ID, 타임스탬프, 컬렉션 ID, 시크릿 키 등을 조합하여 시드를 생성합니다.
 */
export function generateSeed(userId: string, timestamp: number, collectionId: string): string {
    const secret = process.env.VAPID_PRIVATE_KEY || 'default-secret-seed-key'; // 환경변수의 시크릿키 등을 사용
    return `${userId}-${timestamp}-${collectionId}-${secret}`;
}

/**
 * 시드 문자열을 통해 64자리 SHA-256 해시값(16진수)을 생성합니다.
 */
export function generateSha256(seed: string): string {
    return crypto.createHash('sha256').update(seed).digest('hex');
}
