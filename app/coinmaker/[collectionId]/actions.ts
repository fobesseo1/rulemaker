'use server';

import { supabaseAdmin } from '@/lib/supabase';
import { revalidatePath } from 'next/cache';

export async function saveCollectionWebPs(collectionId: string, formData: FormData) {
    try {
        const topologyStr = formData.get('topology') as string;
        if (!topologyStr) return { error: 'No topology data' };
        const topology = JSON.parse(topologyStr);

        // 1. 기존 레이어/파츠 ID 추출용
        const { data: existingLayers } = await supabaseAdmin
            .from('layers')
            .select('id, parts(id)')
            .eq('collection_id', collectionId);

        const existingLayerIds = new Set(existingLayers?.map(l => l.id) || []);
        const existingPartIds = new Set(existingLayers?.flatMap(l => l.parts.map(p => p.id)) || []);

        const keptLayerIds = new Set<string>();
        const keptPartIds = new Set<string>();

        // 2. 토폴로지 순회하며 업서트(Upsert) 및 파일 업로드
        for (const layer of topology) {
            let currentLayerId = layer.id;

            if (layer.isNew) {
                // 새 레이어 인서트
                const { data: newLayer, error: lErr } = await supabaseAdmin
                    .from('layers')
                    .insert({
                        collection_id: collectionId,
                        name: layer.name,
                        z_index: layer.z_index
                    })
                    .select('id').single();

                if (lErr) throw new Error(`Layer Create Error: ${lErr.message}`);
                currentLayerId = newLayer.id;
            } else {
                // 기존 레이어 업데이트
                await supabaseAdmin
                    .from('layers')
                    .update({ name: layer.name, z_index: layer.z_index })
                    .eq('id', currentLayerId);
                keptLayerIds.add(currentLayerId);
            }

            // 파츠 처리
            for (const part of layer.parts) {
                let currentPartId = part.id;

                if (part.isNew) {
                    // 파일 추출 및 WebP 스토리지 업로드
                    const file = formData.get(`file_${part.id}`) as File;
                    if (!file) throw new Error(`File missing for new part: ${part.name}`);

                    const arrayBuffer = await file.arrayBuffer();
                    const buffer = Buffer.from(arrayBuffer);
                    const filePath = `${collectionId}/${currentLayerId}/${Date.now()}-${part.name}.webp`;

                    const { error: uploadErr } = await supabaseAdmin.storage
                        .from('coin-parts')
                        .upload(filePath, buffer, {
                            contentType: 'image/webp',
                            upsert: true
                        });

                    if (uploadErr) throw new Error(`Storage Upload Error: ${uploadErr.message}`);

                    const { data: publicUrlData } = supabaseAdmin.storage
                        .from('coin-parts')
                        .getPublicUrl(filePath);

                    // 파츠 DB Insert
                    const { data: newPart, error: pErr } = await supabaseAdmin
                        .from('parts')
                        .insert({
                            layer_id: currentLayerId,
                            name: part.name,
                            probability_percent: part.probability_percent,
                            image_url: publicUrlData.publicUrl
                        }).select('id').single();

                    if (pErr) throw new Error(`Part Insert Error: ${pErr.message}`);
                    currentPartId = newPart.id;

                } else {
                    // 기존 파츠 업데이트
                    await supabaseAdmin
                        .from('parts')
                        .update({
                            name: part.name,
                            probability_percent: part.probability_percent
                        })
                        .eq('id', currentPartId);
                    keptPartIds.add(currentPartId);
                }
            }
        }

        // 3. 누락된(삭제된) 기존 항목들 DB에서 삭제 처리
        // 파츠를 먼저 지우고 레이어를 지움 (FK 제약조건상 CASCADE가 걸려있긴 함)
        const partsToDelete = Array.from(existingPartIds).filter(id => !keptPartIds.has(id));
        if (partsToDelete.length > 0) {
            await supabaseAdmin.from('parts').delete().in('id', partsToDelete);
        }

        const layersToDelete = Array.from(existingLayerIds).filter(id => !keptLayerIds.has(id));
        if (layersToDelete.length > 0) {
            await supabaseAdmin.from('layers').delete().in('id', layersToDelete);
        }

        revalidatePath(`/coinmaker/${collectionId}`);
        return { success: true };

    } catch (err: any) {
        console.error('saveCollectionWebPs Error:', err);
        return { error: err.message };
    }
}
