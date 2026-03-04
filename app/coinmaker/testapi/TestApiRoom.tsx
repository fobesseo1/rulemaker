'use client';

import { useState } from 'react';
import { Package, PlusCircle, CheckCircle2 } from 'lucide-react';

type CollectionDef = {
    id: string;
    name: string;
};

// 백엔드 API에서 던져주는 Trait 포맷
type Trait = {
    layerName: string;
    zIndex: number;
    partName: string;
    imageUrl: string;
};

// API 응답 전체
type GenerateResponse = {
    success: boolean;
    coinHash: string;
    collectionName: string;
    traits: Trait[];
    error?: string;
};

// 프론트엔드 인벤토리(지갑)에 저장될 아이템 형태
type InventoryItem = {
    id: string;
    timestamp: string; // 뽑은 시간
    hash: string;
    collectionName: string;
    traits: Trait[];
};

export default function TestApiRoom({ collections }: { collections: CollectionDef[] }) {
    const [selectedCollection, setSelectedCollection] = useState<string>(collections[0]?.id || '');
    const [loading, setLoading] = useState(false);
    const [inventory, setInventory] = useState<InventoryItem[]>([]);

    // 방금 뽑은 코인 모달창 띄우기용
    const [newCoin, setNewCoin] = useState<InventoryItem | null>(null);

    const handleGenerate = async () => {
        if (!selectedCollection) return alert('컬렉션을 먼저 선택해주세요.');

        setLoading(true);
        try {
            // 1. 외부 앱에서 우리 백엔드로 요청을 보낸다고 가정
            const res = await fetch('/api/generate-coin', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: `test_user_${Date.now()}`, // 가상 유저
                    collectionId: selectedCollection
                })
            });

            const data = (await res.json()) as GenerateResponse;

            if (!res.ok || !data.success) {
                throw new Error(data.error || 'API 요청 실패');
            }

            // 2. 응답받은 데이터 처리
            const newItem: InventoryItem = {
                id: data.coinHash,
                timestamp: new Date().toLocaleString(),
                hash: data.coinHash,
                collectionName: data.collectionName,
                traits: data.traits
            };

            // 3. 모달 팝업으로 즉시 띄우기
            setNewCoin(newItem);

        } catch (err: any) {
            alert(`코인 생성 실패: ${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // 모달 확인 버튼
    const handleConfirmNewCoin = () => {
        if (newCoin) {
            // 4. 아이템 지갑(inventory)에 저장 후 모달 닫기
            setInventory((prev) => [newCoin, ...prev]);
            setNewCoin(null);
        }
    };

    return (
        <div className="flex flex-col gap-8">

            {/* 1. 요청 폼 (쇼룸 컨트롤러) */}
            <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-6 shadow-sm flex flex-col sm:flex-row gap-6 items-center justify-between">
                <div className="flex-1 w-full flex flex-col gap-2">
                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                        1. 코인 컬렉션 선택
                    </label>
                    {collections.length === 0 ? (
                        <div className="text-sm text-red-500">배포된 컬렉션이 없습니다. 코인메이커에서 먼저 만들어주세요.</div>
                    ) : (
                        <select
                            value={selectedCollection}
                            onChange={e => setSelectedCollection(e.target.value)}
                            className="w-full p-3 bg-zinc-50 dark:bg-zinc-800 border rounded-lg outline-none focus:ring-2 focus:ring-primary text-sm"
                        >
                            <option value="" disabled>컬렉션을 선택하세요</option>
                            {collections.map(c => (
                                <option key={c.id} value={c.id}>{c.name}</option>
                            ))}
                        </select>
                    )}
                </div>

                <div className="flex-1 w-full flex flex-col gap-2">
                    <label className="text-sm font-bold text-zinc-700 dark:text-zinc-300">
                        2. 무상태 API 호출
                    </label>
                    <button
                        onClick={handleGenerate}
                        disabled={loading || !selectedCollection}
                        className="w-full h-[46px] flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold shadow-md transition-colors disabled:opacity-50"
                    >
                        {loading ? 'API Request 중...' : <><PlusCircle size={18} /> 코인 생성(가챠) 요청</>}
                    </button>
                </div>
            </div>


            {/* 2. 아이템 지갑 (인벤토리) 영역 */}
            <div className="bg-white dark:bg-zinc-900 border rounded-2xl p-6 shadow-sm min-h-[400px]">
                <h2 className="text-xl font-bold flex items-center gap-2 mb-6 text-zinc-800 dark:text-zinc-100">
                    <Package className="text-blue-500" />
                    내 아이템 보관소 ({inventory.length}개)
                </h2>

                {inventory.length === 0 ? (
                    <div className="h-64 flex flex-col justify-center items-center text-zinc-400 border-2 border-dashed rounded-xl">
                        <Package size={48} className="mb-4 opacity-30" />
                        <p className="font-medium text-sm">보유 중인 코인이 없습니다.</p>
                        <p className="text-xs mt-1">위에서 코인을 뽑아보세요!</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-6">
                        {inventory.map((item, idx) => (
                            <div key={`${item.id}-${idx}`} className="flex flex-col bg-zinc-50 dark:bg-zinc-800 rounded-xl border overflow-hidden hover:shadow-lg transition-all group">

                                {/* 렌더링 캔버스 영역 */}
                                <div
                                    className="relative w-full aspect-square bg-white dark:bg-zinc-950 border-b overflow-hidden"
                                    style={{ backgroundImage: 'linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%, #eee), linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%, #eee)', backgroundSize: '16px 16px', backgroundPosition: '0 0, 8px 8px' }}
                                >
                                    {/* JSON의 Traits Z-Index 배열 기반으로 프론트엔드 오버레이 처리 */}
                                    {item.traits.map((t, i) => (
                                        <img
                                            key={i}
                                            src={t.imageUrl}
                                            style={{ zIndex: t.zIndex }}
                                            className="absolute inset-0 w-full h-full object-contain drop-shadow transition-transform group-hover:scale-105"
                                            alt={t.partName}
                                        />
                                    ))}
                                </div>

                                {/* 메타데이터 라벨 */}
                                <div className="p-3 flex flex-col gap-1">
                                    <h3 className="font-bold text-sm truncate" title={item.collectionName}>{item.collectionName}</h3>
                                    <span className="text-[10px] text-zinc-500 font-mono truncate" title={item.hash}>#{item.hash.substring(0, 12)}...</span>
                                    <span className="text-[10px] text-zinc-400 mt-1">{item.timestamp}</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* 3. 모달 (방금 뽑은 결과 알럿) - 화면 중앙 오버레이 */}
            {newCoin && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-zinc-900 rounded-2xl shadow-2xl max-w-sm w-full overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                        <div className="p-6 text-center border-b flex flex-col items-center">
                            <CheckCircle2 size={48} className="text-green-500 mb-4" />
                            <h3 className="text-2xl font-black text-zinc-900 dark:text-zinc-50 mb-1">코인 획득 성공!</h3>
                            <p className="text-sm text-zinc-500">지갑에 새로운 코인이 들어왔습니다.</p>
                        </div>

                        <div className="p-6 bg-zinc-50 dark:bg-zinc-800/50 flex flex-col items-center">
                            <div
                                className="relative w-48 h-48 bg-white dark:bg-zinc-950 rounded-xl shadow-inner border mb-4"
                                style={{ backgroundImage: 'linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%, #eee), linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%, #eee)', backgroundSize: '16px 16px', backgroundPosition: '0 0, 8px 8px' }}
                            >
                                {newCoin.traits.map((t, i) => (
                                    <img
                                        key={i}
                                        src={t.imageUrl}
                                        style={{ zIndex: t.zIndex }}
                                        className="absolute inset-0 w-full h-full object-contain drop-shadow-md"
                                    />
                                ))}
                            </div>
                            <div className="w-full text-left space-y-1">
                                <div className="text-xs font-bold text-zinc-500">SHA256 해시:</div>
                                <div className="text-[10px] bg-white dark:bg-zinc-900 p-2 rounded border font-mono text-zinc-600 dark:text-zinc-400 break-all">
                                    {newCoin.hash}
                                </div>
                            </div>
                        </div>

                        <button
                            onClick={handleConfirmNewCoin}
                            className="w-full p-4 font-bold text-white bg-blue-600 hover:bg-blue-700 transition-colors"
                        >
                            확인 (보관소에 넣기)
                        </button>
                    </div>
                </div>
            )}

        </div>
    );
}
