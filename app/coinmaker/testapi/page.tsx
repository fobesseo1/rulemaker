import { supabaseAdmin } from '@/lib/supabase';
import TestApiRoom from './TestApiRoom';

export const dynamic = 'force-dynamic';

export default async function TestApiPage() {
    // DB에서 전체 컬렉션 리스트만 불러와 클라이언트 넘김
    const { data: collections, error } = await supabaseAdmin
        .from('collections')
        .select('id, name')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('Test API Page Load Error:', error);
    }

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950 p-8">
            <div className="max-w-5xl mx-auto space-y-8">
                <header className="flex flex-col gap-2">
                    <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl text-zinc-900 dark:text-zinc-50">
                        외부 연동 (가상) API 쇼룸
                    </h1>
                    <p className="text-zinc-500 dark:text-zinc-400">
                        앱 환경을 모사하여 `/api/generate-coin` 호출 시 어떻게 응답이 들어오고 화면에 인벤토리로 쌓이는지 테스트합니다.
                    </p>
                </header>

                <TestApiRoom collections={collections || []} />
            </div>
        </div>
    );
}

