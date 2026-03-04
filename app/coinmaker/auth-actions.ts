'use server';

import { cookies } from 'next/headers';

export async function loginWithPassword(formData: FormData) {
    const password = formData.get('password') as string;

    // 환경변수 또는 기본값 'coinmaker2026' 사용
    const validPassword = process.env.COINMAKER_PASSWORD || 'coinmaker2026';

    if (password === validPassword) {
        // 비밀번호가 일치하면 쿠키 설정
        const cookieStore = await cookies();
        cookieStore.set('coinmaker_auth', validPassword, {
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax',
            maxAge: 60 * 60 * 24 * 7, // 1주일
            path: '/coinmaker',
        });
        return { success: true };
    } else {
        return { error: '비밀번호가 올바르지 않습니다.' };
    }
}
