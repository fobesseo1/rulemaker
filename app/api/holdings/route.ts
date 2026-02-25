import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';

// GET /api/holdings?endpoint=<url>
export async function GET(req: NextRequest) {
  const endpoint = req.nextUrl.searchParams.get('endpoint');
  if (!endpoint) {
    return NextResponse.json({ error: 'endpoint required' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('holdings')
    .select('*')
    .filter('push_subscription->>endpoint', 'eq', endpoint)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data);
}

// POST /api/holdings
export async function POST(req: NextRequest) {
  const body = await req.json();
  const {
    symbol,
    name,
    buy_price,
    quantity,
    trailing_pct,
    buy_reason_category,
    buy_reason_memo,
    push_subscription,
  } = body;

  const defense_line = Math.round(Number(buy_price) * (1 - Number(trailing_pct) / 100));

  const { data, error } = await supabase
    .from('holdings')
    .insert({
      symbol,
      name,
      buy_price: Number(buy_price),
      quantity: quantity ? Number(quantity) : null,
      highest_price: Number(buy_price),
      defense_line,
      trailing_pct: Number(trailing_pct),
      buy_reason_category: buy_reason_category || null,
      buy_reason_memo: buy_reason_memo || null,
      push_subscription,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json(data, { status: 201 });
}
