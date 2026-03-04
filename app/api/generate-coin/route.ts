import { NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { generateSeed, generateSha256 } from '@/lib/hash';

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
};

export async function OPTIONS() {
    return NextResponse.json({}, { headers: corsHeaders });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { userId, collectionId } = body;

        if (!userId || !collectionId) {
            return NextResponse.json({ success: false, error: 'userId and collectionId are required' }, { status: 400, headers: corsHeaders });
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
            return NextResponse.json({ success: false, error: 'Collection not found' }, { status: 404, headers: corsHeaders });
        }

        // --- 전역 허가된 URL(Origin) 검증 로직 ---
        const origin = req.headers.get('origin') || req.headers.get('referer');

        const { data: settings } = await supabaseAdmin
            .from('system_settings')
            .select('allowed_urls')
            .eq('id', 1)
            .single();

        const allowedOriginsStr = settings?.allowed_urls;

        if (allowedOriginsStr) {
            if (!origin) {
                return NextResponse.json({ success: false, error: 'Origin header is missing but required by security policy' }, { status: 403, headers: corsHeaders });
            }

            const allowedList = allowedOriginsStr.split(',').map((url: string) => url.trim()).filter(Boolean);

            if (allowedList.length > 0) {
                const isAllowed = allowedList.some((allowedUrl: string) => origin.startsWith(allowedUrl));

                if (!isAllowed) {
                    return NextResponse.json({ success: false, error: `Origin ${origin} is not allowed` }, { status: 403, headers: corsHeaders });
                }
            }
        }
        // ----------------------------------------

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

        const isAllowedOrigin = origin ? origin : 'unknown';

        // 4. 생성된 코인 정보를 DB에 저장 (generated_coins)
        const { error: insertErr } = await supabaseAdmin
            .from('generated_coins')
            .insert({
                collection_id: collectionId,
                collection_name: collection.name,
                user_id: userId,
                coin_hash: coinHash,
                origin_url: isAllowedOrigin,
                traits: traits
            });

        if (insertErr) {
            console.error('Failed to save generated coin to DB:', insertErr);
            // 에러가 나더라도 가상화폐 생성 결과 자체는 반환해주는 방향으로 갈지 결정 (여기선 일단 로그만 찍고 진행)
        }

        // 5. PRD 요구스펙에 맞춘 JSON 반환
        return NextResponse.json({
            success: true,
            coinHash,
            collectionName: collection.name,
            traits
        }, { headers: corsHeaders });

    } catch (error: any) {
        console.error('generate-coin API Error:', error);
        return NextResponse.json({ success: false, error: 'Internal Server Error' }, { status: 500, headers: corsHeaders });
    }
}
