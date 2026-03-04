'use client';

import { useState, useMemo } from 'react';
import { Plus, Trash2, UploadCloud, Save, Play } from 'lucide-react';
import { saveCollectionWebPs } from './actions';

// [Types]
export type DBPart = {
    id: string;
    name: string;
    probability_percent: number;
    image_url: string;
};

export type DBLayer = {
    id: string;
    name: string;
    z_index: number;
    parts: DBPart[];
};

export type LocalPart = {
    id: string;
    name: string;
    probability_percent: number;
    image_url?: string;
    file?: File;
    previewUrl?: string;
    isNew?: boolean;
};

export type LocalLayer = {
    id: string;
    name: string;
    z_index: number;
    isNew?: boolean;
    parts: LocalPart[];
};

export default function ClientBuilder({
    collectionId,
    initialLayers,
}: {
    collectionId: string;
    initialLayers: DBLayer[];
}) {
    const [layers, setLayers] = useState<LocalLayer[]>(
        initialLayers.map((l) => ({
            ...l,
            parts: l.parts.map((p) => ({ ...p, previewUrl: p.image_url })),
        }))
    );

    // 수동 렌더링용 (LayerID -> PartID)
    const [selectedParts, setSelectedParts] = useState<Record<string, string>>({});
    const [loading, setLoading] = useState(false);
    const [testResultHash, setTestResultHash] = useState<string | null>(null);

    // 현재 수동 조합 확률 계산
    const currentProbability = useMemo(() => {
        let prob = 1;
        let hasSelection = false;
        for (const layer of layers) {
            const selectedPartId = selectedParts[layer.id];
            if (selectedPartId) {
                const part = layer.parts.find(p => p.id === selectedPartId);
                if (part) {
                    prob *= (part.probability_percent / 100);
                    hasSelection = true;
                }
            }
        }
        return hasSelection ? (prob * 100).toFixed(6) : "0";
    }, [layers, selectedParts]);


    // [Handlers] 레이어 추가
    const handleAddLayer = () => {
        const newId = `local-layer-${Date.now()}`;
        const zIndex = layers.length > 0 ? Math.max(...layers.map(l => l.z_index)) + 1 : 1;
        setLayers([{ id: newId, name: `New Layer ${layers.length + 1}`, z_index: zIndex, isNew: true, parts: [] }, ...layers]);
    };

    const handleUpdateLayer = (id: string, updates: Partial<LocalLayer>) => {
        setLayers(layers.map(l => l.id === id ? { ...l, ...updates } : l));
    };

    const handleDeleteLayer = (id: string) => {
        if (confirm('레이어를 삭제하시겠습니까? 관련 파츠도 모두 제거됩니다.')) {
            setLayers(layers.filter(l => l.id !== id));
            // 선택 항목에서도 제거
            const newSelected = { ...selectedParts };
            delete newSelected[id];
            setSelectedParts(newSelected);
        }
    };

    // [Handlers] 파츠 드롭
    const handleDrop = (e: React.DragEvent<HTMLDivElement>, layerId: string) => {
        e.preventDefault();
        if (!e.dataTransfer.files || e.dataTransfer.files.length === 0) return;

        const files = Array.from(e.dataTransfer.files).filter(f => f.type === 'image/png');

        // 비동기 처리 위해 map
        Promise.all(files.map(file => {
            return new Promise<LocalPart>((resolve, reject) => {
                const url = URL.createObjectURL(file);
                const img = new Image();
                img.onload = () => {
                    if (img.width !== 512 || img.height !== 512) {
                        URL.revokeObjectURL(url);
                        alert(`이미지 규격 오류: ${file.name} (512x512 PNG만 지원됩니다.)`);
                        reject();
                        return;
                    }
                    resolve({
                        id: `local-part-${Date.now()}-${Math.random().toString(36).substring(7)}`,
                        name: file.name.replace('.png', ''),
                        probability_percent: 10, // 기본값
                        file: file,
                        previewUrl: url,
                        isNew: true
                    });
                };
                img.onerror = () => reject();
                img.src = url;
            });
        }))
            .then(newParts => {
                const validParts = newParts.filter(Boolean);
                setLayers(layers.map(l => l.id === layerId ? { ...l, parts: [...l.parts, ...validParts] } : l));
            })
            .catch(console.error);
    };

    const handleUpdatePart = (layerId: string, partId: string, updates: Partial<LocalPart>) => {
        setLayers(layers.map(l => l.id === layerId ? {
            ...l,
            parts: l.parts.map(p => p.id === partId ? { ...p, ...updates } : p)
        } : l));
    };

    const handleDeletePart = (layerId: string, partId: string) => {
        setLayers(layers.map(l => l.id === layerId ? {
            ...l,
            parts: l.parts.filter(p => p.id !== partId)
        } : l));
        if (selectedParts[layerId] === partId) {
            const newSelected = { ...selectedParts };
            delete newSelected[layerId];
            setSelectedParts(newSelected);
        }
    };


    // [액션] 배포 (WebP 변환 및 서버 Sync)
    const handleDeploy = async () => {
        // 배포 전 확률 검증 (각 레이어 파츠들의 확률 총합이 100%인지 확인)
        for (const layer of layers) {
            if (layer.parts.length === 0) continue; // 파츠가 없는 레이어는 패스하거나, 혹은 이것도 에러처리할 수 있음.
            const sum = layer.parts.reduce((acc, p) => acc + p.probability_percent, 0);
            // 부동소수점 오차 방지 (예: 99.99999)
            if (Math.abs(sum - 100) > 0.01) {
                alert(`[${layer.name}] 레이어의 파츠 확률 총합이 100%가 아닙니다.\n(현재 총합: ${sum.toFixed(1)}%)`);
                return;
            }
        }

        setLoading(true);
        try {
            const formData = new FormData();


            // 레이어 속성과 파츠 메타 정보를 넘기기 위한 토폴로지 JSON
            const topology = layers.map(l => ({
                id: l.id,
                name: l.name,
                z_index: l.z_index,
                isNew: l.isNew,
                parts: l.parts.map(p => ({
                    id: p.id,
                    name: p.name,
                    probability_percent: p.probability_percent,
                    image_url: p.image_url,
                    isNew: p.isNew
                }))
            }));
            formData.append('topology', JSON.stringify(topology));

            // 새 파일 WebP 변환
            let localFilesCount = 0;
            for (const layer of layers) {
                for (const part of layer.parts) {
                    if (part.file && part.isNew) {
                        // Blob 변환 (무손실 퀄리티에 가까운 세팅)
                        const blob = await convertToWebP(part.previewUrl!);
                        formData.append(`file_${part.id}`, blob, `${part.name}.webp`);
                        localFilesCount++;
                    }
                }
            }

            const result = await saveCollectionWebPs(collectionId, formData);
            if (result.error) throw new Error(result.error);

            alert(`배포 성공! (신규 업로드: ${localFilesCount}건)`);
            window.location.reload();
        } catch (err: any) {
            alert(`배포 중 오류가 발생했습니다.\n${err.message}`);
        } finally {
            setLoading(false);
        }
    };

    // WebP 변환 유틸
    const convertToWebP = (srcUrl: string): Promise<Blob> => {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
                const canvas = document.createElement('canvas');
                canvas.width = 512;
                canvas.height = 512;
                const ctx = canvas.getContext('2d');
                if (!ctx) return reject(new Error('Canvas ctx null'));
                ctx.drawImage(img, 0, 0);
                canvas.toBlob((blob) => {
                    if (blob) resolve(blob);
                    else reject(new Error('Canvas to Blob Failed'));
                }, 'image/webp', 1.0);
            };
            img.onerror = () => reject(new Error('Image decode failed'));
            img.src = srcUrl;
        });
    };

    // [랜덤 테스트 시뮬레이터]
    const handleRandomSimulate = async () => {
        const textEncoder = new TextEncoder();
        const seedMsg = `local-test-${Date.now()}`;
        const hashBuffer = await crypto.subtle.digest('SHA-256', textEncoder.encode(seedMsg));
        const hashArray = Array.from(new Uint8Array(hashBuffer));
        const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
        setTestResultHash(hashHex);

        const newSelected: Record<string, string> = {};
        let hashIndex = 0;

        // Z-index 순으로 정렬하여 레이어 순회
        const sortedLayers = [...layers].sort((a, b) => a.z_index - b.z_index);

        for (const layer of sortedLayers) {
            if (layer.parts.length === 0) continue;

            let totalProb = 0;
            const probRanges = layer.parts.map(p => {
                const range = { partId: p.id, from: totalProb, to: totalProb + p.probability_percent };
                totalProb += p.probability_percent;
                return range;
            });

            const hexSegment = hashHex.substring(hashIndex, hashIndex + 4);
            hashIndex += 4; if (hashIndex >= 64) hashIndex = 0;

            const intVal = parseInt(hexSegment, 16);
            const randomPoint = (intVal % Math.max(100, totalProb * 10)) / 10;

            let selectedPId = layer.parts[0].id;
            for (const r of probRanges) {
                if (randomPoint >= r.from && randomPoint < r.to) {
                    selectedPId = r.partId;
                    break;
                }
            }
            newSelected[layer.id] = selectedPId;
        }
        setSelectedParts(newSelected);
    };


    // 렌더링 파츠 (Z-index 순 정렬)
    const renderedParts = layers
        .filter(l => selectedParts[l.id])
        .map(l => ({
            zIndex: l.z_index,
            previewUrl: l.parts.find(p => p.id === selectedParts[l.id])?.previewUrl
        }))
        .sort((a, b) => a.zIndex - b.zIndex);

    return (
        <div className="flex-1 flex gap-6 overflow-hidden mt-4">
            {/* 좌측 사이드 (관리 폼) */}
            <div className="w-1/2 flex flex-col gap-4 overflow-y-auto pr-2 pb-20 scrollbar-hide">
                <div className="flex justify-between items-center bg-white dark:bg-zinc-900 p-4 rounded-xl border shadow-sm">
                    <h2 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">레이어 구성</h2>
                    <button onClick={handleAddLayer} className="flex items-center gap-1 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-3 py-1.5 rounded-md text-sm font-medium hover:opacity-90 transition-opacity">
                        <Plus size={16} /> 추가
                    </button>
                </div>

                {layers.sort((a, b) => b.z_index - a.z_index).map(layer => (
                    <div key={layer.id} className="bg-white dark:bg-zinc-900 border rounded-xl shadow-sm">
                        <div className="bg-zinc-50 dark:bg-zinc-800 p-3 border-b flex items-center justify-between">
                            <div className="flex gap-4 w-full">
                                <input
                                    type="number"
                                    value={layer.z_index}
                                    onChange={e => handleUpdateLayer(layer.id, { z_index: parseInt(e.target.value) || 0 })}
                                    className="w-16 px-2 py-1 border rounded text-sm text-center font-mono focus:ring-2 outline-none bg-white dark:bg-zinc-900"
                                    title="Z-Index (낮을수록 밑에 깔림)"
                                />
                                <input
                                    type="text"
                                    value={layer.name}
                                    onChange={e => handleUpdateLayer(layer.id, { name: e.target.value })}
                                    className="flex-1 px-2 py-1 border rounded text-sm font-bold focus:ring-2 outline-none bg-white dark:bg-zinc-900"
                                />
                            </div>
                            <button onClick={() => handleDeleteLayer(layer.id)} className="ml-4 text-red-500 hover:bg-red-500/10 p-1.5 rounded transition-colors">
                                <Trash2 size={16} />
                            </button>
                        </div>

                        {/* 파츠 드롭존 */}
                        <div
                            onDragOver={e => e.preventDefault()}
                            onDrop={e => handleDrop(e, layer.id)}
                            className="p-6 text-center border-b border-dashed bg-zinc-50/50 dark:bg-zinc-900/50 cursor-pointer hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
                        >
                            <div className="flex flex-col items-center justify-center text-zinc-500">
                                <UploadCloud size={24} className="mb-2 text-zinc-400" />
                                <p className="text-sm font-medium">PNG 파츠 끌어다 놓기</p>
                                <p className="text-xs mt-1 opacity-70">512x512 사이즈만 지원</p>
                            </div>
                        </div>

                        {/* 포함된 파츠 리스트 */}
                        <div className="p-3 bg-white dark:bg-zinc-900 flex flex-col gap-2">
                            {layer.parts.length === 0 && (
                                <p className="text-sm text-zinc-400 text-center py-4">등록된 파츠가 없습니다.</p>
                            )}
                            {layer.parts.map(part => (
                                <div
                                    key={part.id}
                                    className={`flex items-center gap-4 p-2 border rounded-lg transition-colors cursor-pointer ${selectedParts[layer.id] === part.id ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-500' : 'bg-white dark:bg-zinc-800 hover:border-zinc-400'}`}
                                    onClick={() => setSelectedParts({ ...selectedParts, [layer.id]: part.id })}
                                >
                                    <img src={part.previewUrl} alt={part.name} className="w-14 h-14 object-contain bg-zinc-100 dark:bg-zinc-900 rounded border pixelated" />
                                    <div className="flex-1">
                                        <input
                                            type="text"
                                            value={part.name}
                                            onChange={e => handleUpdatePart(layer.id, part.id, { name: e.target.value })}
                                            className="w-full text-sm font-bold bg-transparent border-b border-transparent focus:border-zinc-300 outline-none mb-1 text-zinc-800 dark:text-zinc-100"
                                            onClick={e => e.stopPropagation()}
                                        />
                                        <div className="flex items-center gap-2 text-xs text-zinc-500">
                                            확률 설정:
                                            <input
                                                type="number"
                                                step="0.01"
                                                value={part.probability_percent}
                                                onChange={e => handleUpdatePart(layer.id, part.id, { probability_percent: parseFloat(e.target.value) || 0 })}
                                                className="w-20 px-1 py-0.5 border rounded bg-white dark:bg-zinc-900 text-zinc-800 dark:text-zinc-100 focus:ring-1 outline-none"
                                                onClick={e => e.stopPropagation()}
                                            /> %
                                        </div>
                                    </div>
                                    <button
                                        onClick={(e) => { e.stopPropagation(); handleDeletePart(layer.id, part.id); }}
                                        className="p-2 text-zinc-400 hover:text-red-500 transition-colors shrink-0"
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
            </div>

            {/* 우측 캔버스 (미리보기) */}
            <div className="w-1/2 flex flex-col bg-white dark:bg-zinc-900 border rounded-xl shadow-sm p-6 items-center justify-start sticky top-6 self-start max-h-[85vh] overflow-y-auto">
                <div className="flex justify-between w-full mb-6 items-center">
                    <h2 className="font-bold text-lg text-zinc-900 dark:text-zinc-100">테스트 캔버스</h2>
                    <div className="flex gap-3">
                        <button onClick={handleRandomSimulate} className="flex items-center gap-1.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 border hover:bg-zinc-200 dark:hover:bg-zinc-700 px-4 py-2 rounded-lg text-sm font-semibold transition-colors">
                            <Play size={16} /> 랜덤 (로컬)
                        </button>
                        <button onClick={handleDeploy} disabled={loading} className="flex items-center gap-1.5 bg-blue-600 text-white hover:bg-blue-700 px-6 py-2 rounded-lg text-sm font-bold shadow-md transition-colors disabled:opacity-50">
                            {loading ? '배포 중...' : <><Save size={16} /> 최종 배포</>}
                        </button>
                    </div>
                </div>

                {/* 메인 캔버스 DOM */}
                <div
                    className="relative w-[400px] h-[400px] sm:w-[512px] sm:h-[512px] bg-white rounded-2xl shadow-inner border overflow-hidden shrink-0"
                    style={{ backgroundImage: 'linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%, #eee), linear-gradient(45deg, #eee 25%, transparent 25%, transparent 75%, #eee 75%, #eee)', backgroundSize: '20px 20px', backgroundPosition: '0 0, 10px 10px' }}
                >
                    {renderedParts.length === 0 ? (
                        <div className="absolute inset-0 flex items-center justify-center text-zinc-400 text-sm flex-col bg-zinc-50 dark:bg-zinc-900">
                            <UploadCloud size={32} className="mb-2 opacity-50 text-zinc-400" />
                            <p>선택된 파츠가 없습니다.</p>
                            <p className="mt-1 text-xs px-12 text-center opacity-70">좌측 레이어에서 파츠를 선택하여 수동으로 조합을 만들어보세요.</p>
                        </div>
                    ) : (
                        renderedParts.map((p, idx) => (
                            <img
                                key={idx}
                                src={p.previewUrl}
                                style={{ zIndex: p.zIndex }}
                                className="absolute inset-0 w-full h-full object-contain pointer-events-none drop-shadow-sm"
                            />
                        ))
                    )}
                </div>

                {/* 디스플레이 하단 정보 (확률 표시) */}
                <div className="mt-8 w-full max-w-[512px] p-6 bg-zinc-50 dark:bg-zinc-950 rounded-xl border text-center flex flex-col gap-2">
                    <p className="text-sm font-bold text-zinc-500 uppercase tracking-wider">현재 조합 희귀 확률</p>
                    <p className="text-4xl font-black font-mono text-zinc-900 dark:text-zinc-100">{currentProbability} %</p>
                    {testResultHash && (
                        <div className="mt-4 p-3 bg-white dark:bg-zinc-900 border rounded-lg text-left shadow-sm">
                            <p className="text-xs font-bold text-zinc-500 mb-1">SHA256 해시값 (무작위 테스트용)</p>
                            <p className="text-xs font-mono text-zinc-700 dark:text-zinc-300 break-all leading-relaxed">
                                {testResultHash}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
