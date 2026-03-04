import { supabaseAdmin } from '@/lib/supabase';
import Link from 'next/link';
import { createCollection } from './actions';

export const dynamic = 'force-dynamic';

export default async function CoinMakerPage() {
    const { data: collections, error } = await supabaseAdmin
        .from('collections')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('컬렉션 조회 에러:', error);
    }

    return (
        <div className="p-8 max-w-5xl mx-auto space-y-10">
            <div className="flex flex-col gap-2">
                <h1 className="text-3xl font-extrabold tracking-tight lg:text-4xl text-foreground">
                    마불 코인 컬렉션 대시보드
                </h1>
                <p className="text-muted-foreground">제너러티브 코인 시리즈를 생성하고 구성요소를 설정하세요.</p>
            </div>

            {/* 새 컬렉션 생성 카드 */}
            <div className="bg-card text-card-foreground p-6 rounded-xl border shadow-sm">
                <h2 className="text-xl font-semibold mb-4">새 컬렉션 생성</h2>
                <form action={async (formData) => {
                    'use server';
                    await createCollection(formData);
                }} className="flex gap-4">
                    <input
                        type="text"
                        name="name"
                        placeholder="컬렉션 이름 지정 (예: 2026 윈터팩)"
                        className="flex-1 rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
                        required
                        autoComplete="off"
                    />
                    <button
                        type="submit"
                        className="inline-flex items-center justify-center whitespace-nowrap rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
                    >
                        프로젝트 추가
                    </button>
                </form>
            </div>

            {/* 컬렉션 목록 갤러리 */}
            <h2 className="text-2xl font-semibold tracking-tight">생성된 컬렉션 ({collections?.length || 0})</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {collections?.map((collection) => (
                    <Link
                        key={collection.id}
                        href={`/coinmaker/${collection.id}`}
                        className="group relative flex flex-col justify-between overflow-hidden rounded-xl border bg-card p-6 shadow-sm transition-all hover:border-primary hover:shadow-md"
                    >
                        <div>
                            <h3 className="font-bold text-xl mb-2 group-hover:text-primary transition-colors">{collection.name}</h3>
                            <p className="text-sm text-muted-foreground">
                                생성일: {new Date(collection.created_at).toLocaleDateString()}
                            </p>
                        </div>
                        <div className="mt-6 flex items-center text-sm font-medium text-primary">
                            파츠 편집 및 확률 설정 관리하기 &rarr;
                        </div>
                    </Link>
                ))}

                {(!collections || collections.length === 0) && (
                    <div className="col-span-full border-2 border-dashed rounded-xl p-12 text-center text-muted-foreground">
                        아직 생성된 코인 컬렉션이 없습니다.
                    </div>
                )}
            </div>
        </div>
    );
}
