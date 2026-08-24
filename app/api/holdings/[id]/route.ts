import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// PATCH /api/holdings/[id]
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = await req.json();
  const { trailing_pct, buy_price, quantity, buy_reason_category, buy_reason_memo } = body;

  const updates: Record<string, unknown> = {};

  if (buy_price !== undefined) {
    updates.buy_price = Number(buy_price);
  }
  if (quantity !== undefined) {
    updates.quantity = quantity === null || quantity === '' ? null : Number(quantity);
  }
  if (buy_reason_category !== undefined) {
    updates.buy_reason_category = buy_reason_category || null;
  }
  if (buy_reason_memo !== undefined) {
    updates.buy_reason_memo = buy_reason_memo || null;
  }

  if (trailing_pct !== undefined) {
    const trailingPctNum = Number(trailing_pct);
    if (!Number.isFinite(trailingPctNum) || trailingPctNum <= 0 || trailingPctNum >= 100) {
      return NextResponse.json({ error: 'trailing_pct must be between 0 and 100' }, { status: 400 });
    }

    // defense_line은 매입가가 아니라 현재 highest_price 기준으로 재계산해야
    // 그동안 트레일링 스탑으로 올라간 방어선 이력이 유지된다.
    const { data: existing, error: fetchErr } = await supabase
      .from('holdings')
      .select('highest_price')
      .eq('id', id)
      .single();

    if (fetchErr || !existing) {
      return NextResponse.json({ error: fetchErr?.message ?? 'Holding not found' }, { status: 404 });
    }

    updates.trailing_pct = trailingPctNum;
    updates.defense_line = Math.round(Number(existing.highest_price) * (1 - trailingPctNum / 100));
  }

  const { data, error } = await supabase
    .from('holdings')
    .update(updates)
    .eq('id', id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const { error } = await supabase.from('holdings').delete().eq('id', id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ success: true });
}
