import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateSeed, generateSha256 } from '@/lib/hash';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, collectionId } = body;

        if (!userId || !collectionId) {
            return NextResponse.json({ success: false, error: 'userId and collectionId are required' }, { status: 400 });
        }

        // 1. 컬렉션 및 파츠 메타데이터 로드
        const { data: collection, error: collErr } = await supabaseAdmin
            .from('collections')
            .select(`
        id, 
        name,
        layers (
          id, name, z_index,
          parts (id, name, probability_percent, image_url)
        )
      `)
            .eq('id', collectionId)
            .single();

        if (collErr || !collection) {
            return NextResponse.json({ success: false, error: 'Collection not found' }, { status: 404 });
        }

        // 2. 난수 시드 및 해시 생성
        const timestamp = Date.now();
        const seed = generateSeed(userId, timestamp, collectionId);
        const coinHash = generateSha256(seed);

        // 3. 조합 로직 (유전자 혼합)
        const traits = [];
        let hashIndex = 0;

        // 레이어 z_index 순으로 정렬
        const sortedLayers = [...collection.layers].sort((a, b) => a.z_index - b.z_index);

        for (const layer of sortedLayers) {
            if (!layer.parts || layer.parts.length === 0) continue;

            let totalProb = 0;
            const probRanges = layer.parts.map(p => {
                const range = { part: p, from: totalProb, to: totalProb + p.probability_percent };
                totalProb += p.probability_percent;
                return range;
            });

            // 해시 문자열에서 4글자(2바이트)를 추출해 난수로 활용
            const hexSegment = coinHash.substring(hashIndex, hashIndex + 4);
            hashIndex += 4;
            // 레이어가 16개(64자리/4) 넘어갈 경우 해시포인터 롤오버
            if (hashIndex >= 64) hashIndex = 0;

            const intVal = parseInt(hexSegment, 16);

            // 모듈러 연산을 통해 해당 레이어의 총 확률 내에서의 랜덤 10진수 포인트를 결정
            // (소수점 고려 * 10 연산)
            const randomPoint = (intVal % Math.max(10, totalProb * 10)) / 10;

            let selectedPart = layer.parts[0]; // 기본 fallback
            for (const r of probRanges) {
                if (randomPoint >= r.from && randomPoint < r.to) {
                    selectedPart = r.part;
                    break;
                }
            }

            traits.push({
                layerName: layer.name,
                zIndex: layer.z_index,
                partName: selectedPart.name,
                imageUrl: selectedPart.image_url
            });
        }

        // 4. PRD 요구스펙에 맞춘 JSON 반환
        return NextResponse.json({
            success: true,
            coinHash,
            collectionName: collection.name,
            traits
        });

    } catch (error: any) {
        console.error('generate-coin API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500 });
    }
}
