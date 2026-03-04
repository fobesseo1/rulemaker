'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { loginWithPassword } from './auth-actions';

export default function LoginForm() {
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const router = useRouter();

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);

        const formData = new FormData();
        formData.append('password', password);

        const result = await loginWithPassword(formData);

        setLoading(false);

        if (result.error) {
            setError(result.error);
        } else {
            router.refresh();
        }
    };

    return (
        <div className="flex flex-col items-center justify-center min-h-[60vh]">
            <div className="w-full max-w-sm p-8 space-y-6 bg-card rounded-xl shadow-lg border">
                <div className="space-y-2 text-center">
                    <h1 className="text-2xl font-bold tracking-tight text-foreground">접근 제한됨</h1>
                    <p className="text-sm text-muted-foreground">코인메이커 대시보드에 접근하려면 비밀번호를 입력하세요.</p>
                </div>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <Input
                            type="password"
                            placeholder="비밀번호"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            disabled={loading}
                            required
                        />
                    </div>
                    {error && <p className="text-sm text-red-500 text-center">{error}</p>}
                    <Button type="submit" className="w-full" disabled={loading}>
                        {loading ? '확인 중...' : '확인'}
                    </Button>
                </form>
            </div>
        </div>
    );
}
