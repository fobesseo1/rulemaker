import { cookies } from 'next/headers';
import LoginForm from './LoginForm';

export default async function CoinmakerLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    // 1. 쿠키에서 coinmaker_auth 값을 읽어옵니다.
    const cookieStore = await cookies();
    const authCookie = cookieStore.get('coinmaker_auth');

    // 2. 환경변수 또는 기본 비밀번호 가져오기
    const validPassword = process.env.COINMAKER_PASSWORD || 'coinmaker2026';

    // 3. 쿠키에 저장된 값이 유효한 비밀번호와 일치하는지 확인
    const isAuthenticated = authCookie?.value === validPassword;

    // 인증되지 않았다면 로그인 폼을 렌더링
    if (!isAuthenticated) {
        return (
            <div className="min-h-screen bg-background text-foreground">
                <LoginForm />
            </div>
        );
    }

    // 인증되었다면 자식 페이지 렌더링
    return (
        <div className="min-h-screen bg-background text-foreground">
            {children}
        </div>
    );
}
