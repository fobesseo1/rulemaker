import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// PATCH /api/holdings/subscription
// 구독이 갱신됐을 때 해당 디바이스의 모든 holdings 구독 정보를 업데이트
export async function PATCH(req: NextRequest) {
  const body = await req.json();
  const { old_endpoint, new_subscription } = body;

  if (!old_endpoint || !new_subscription) {
    return NextResponse.json({ error: 'old_endpoint and new_subscription required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('holdings')
    .update({ push_subscription: new_subscription })
    .filter('push_subscription->>endpoint', 'eq', old_endpoint)
    .select('id');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ updated: data?.length ?? 0 });
}
