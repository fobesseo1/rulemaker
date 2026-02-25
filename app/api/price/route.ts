import { NextRequest, NextResponse } from 'next/server';
import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

function isKoreanMarketOpen(): boolean {
  const now = new Date();
  // KST = UTC+9
  const kst = new Date(now.getTime() + 9 * 60 * 60 * 1000);
  const day = kst.getUTCDay(); // 0=일, 6=토
  if (day === 0 || day === 6) return false;
  const minuteOfDay = kst.getUTCHours() * 60 + kst.getUTCMinutes();
  // 09:00~15:30 KST = 540~930분
  return minuteOfDay >= 540 && minuteOfDay < 930;
}

export async function GET(req: NextRequest) {
  const symbol = req.nextUrl.searchParams.get('symbol');
  if (!symbol) {
    return NextResponse.json({ error: 'symbol required' }, { status: 400 });
  }

  try {
    const result = await yahooFinance.quote(symbol);
    return NextResponse.json({
      price: result.regularMarketPrice ?? 0,
      currency: result.currency ?? 'KRW',
      name: result.longName ?? result.shortName ?? symbol,
      isMarketOpen: isKoreanMarketOpen(),
    });
  } catch {
    return NextResponse.json({ error: '가격 조회에 실패했습니다' }, { status: 500 });
  }
}
