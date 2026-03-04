import { supabaseAdmin } from '@/lib/supabase';
import ClientBuilder from './ClientBuilder';
import { notFound } from 'next/navigation';

export default async function CoinMakerDetail({
    params,
}: {
    params: Promise<{ collectionId: string }>;
}) {
    const resolvedParams = await params;
    const collectionId = resolvedParams.collectionId;

    // 컬렉션 정보 로드
    const { data: collection, error: collectionError } = await supabaseAdmin
        .from('collections')
        .select('*')
        .eq('id', collectionId)
        .single();

    if (collectionError || !collection) {
        return notFound();
    }

    // 레이어와 파츠 정보 로드 (Z-index 순 정렬)
    const { data: layers } = await supabaseAdmin
        .from('layers')
        .select(`
      *,
      parts (*)
    `)
        .eq('collection_id', collectionId)
        .order('z_index', { ascending: true });

    return (
        <div className="min-h-screen bg-zinc-50 dark:bg-zinc-950">
            <div className="max-w-[1400px] mx-auto p-6 flex flex-col h-screen">
                <header className="flex justify-between items-center mb-6 shrink-0">
                    <div>
                        <h1 className="text-2xl font-bold">{collection.name}</h1>
                        <p className="text-sm text-gray-500">
                            이미지(PNG 512x512)를 업로드하고 배포 시 자동으로 WebP 변환 및 최적화되어 서버에 저장됩니다.
                        </p>
                    </div>
                </header>

                {/* 상태 공유를 위한 클라이언트 컴포넌트 마운트 */}
                <ClientBuilder
                    collectionId={collection.id}
                    initialLayers={layers || []}
                />
            </div>
        </div>
    );
}
