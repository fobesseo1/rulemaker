import 'dotenv/config';
import webpush from 'web-push';
import { createClient } from '@supabase/supabase-js';
import YahooFinance from 'yahoo-finance2';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

const supabase = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

const yahooFinance = new YahooFinance({ suppressNotices: ['yahooSurvey'] });

async function checkPrices() {
  console.log('=== 가격 체크 시작 ===');

  const { data: holdings } = await supabase.from('holdings').select('*');
  if (!holdings?.length) return;

  // 종목별 1번만 API 호출
  const symbols = [...new Set(holdings.map((h: any) => h.symbol))];
  const prices: Record<string, number> = {};

  for (const symbol of symbols) {
    const result = await yahooFinance.quote(symbol as string);
    prices[symbol as string] = result.regularMarketPrice ?? 0;
    console.log(`${symbol} 현재가: ${prices[symbol as string].toLocaleString()}`);
  }

  for (const holding of holdings) {
    const currentPrice = prices[holding.symbol];
    const defenseLine = Number(holding.defense_line);
    const highestPrice = Number(holding.highest_price);

    // 최고가 갱신
    if (currentPrice > highestPrice) {
      const newDefenseLine = Math.round(currentPrice * (1 - Number(holding.trailing_pct) / 100));
      await supabase
        .from('holdings')
        .update({ highest_price: currentPrice, defense_line: newDefenseLine })
        .eq('id', holding.id);

      await sendPush(holding.push_subscription, {
        title: `${holding.name} 방어선 상향`,
        body: `방어선이 ${newDefenseLine.toLocaleString()}원으로 올라갔습니다 ✅`,
      });
      console.log(`✅ ${holding.name} 방어선 상향 → ${newDefenseLine.toLocaleString()}`);
    }

    // 방어선 이탈
    if (currentPrice < defenseLine) {
      await sendPush(holding.push_subscription, {
        title: `⚠️ ${holding.name}: 원칙이 작동했습니다`,
        body: `방어선(${defenseLine.toLocaleString()}원)이 붕괴되었습니다`,
      });
      console.log(`🚨 ${holding.name} 방어선 이탈!`);
    }
  }

  // 로그 기록
  await supabase
    .from('price_logs')
    .insert(Object.entries(prices).map(([symbol, price]) => ({ symbol, price })));
  console.log('=== 완료 ===');
}

async function sendPush(subscription: any, data: { title: string; body: string }) {
  try {
    await webpush.sendNotification(subscription, JSON.stringify(data));
    console.log('✅ 알림 발송 성공');
  } catch (error) {
    console.error('❌ 알림 발송 실패:', error);
  }
}

checkPrices();
