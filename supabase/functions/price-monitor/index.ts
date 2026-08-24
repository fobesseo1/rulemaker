import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import webpush from "npm:web-push";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const vapidPublicKey = Deno.env.get("NEXT_PUBLIC_VAPID_PUBLIC_KEY")!;
const vapidPrivateKey = Deno.env.get("VAPID_PRIVATE_KEY")!;
const vapidEmail = Deno.env.get("VAPID_EMAIL")!;

webpush.setVapidDetails(vapidEmail, vapidPublicKey, vapidPrivateKey);

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function getYahooPrice(symbol: string): Promise<number> {
  const res = await fetch(
    `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1m&range=1d`,
    {
      headers: {
        "User-Agent": "Mozilla/5.0 (compatible; price-monitor/1.0)",
      },
    }
  );
  if (!res.ok) throw new Error(`Yahoo Finance API error: ${res.status}`);
  const data = await res.json();
  const price = data?.chart?.result?.[0]?.meta?.regularMarketPrice ?? 0;
  return price;
}

async function sendPush(
  subscription: unknown,
  data: { title: string; body: string }
) {
  try {
    await webpush.sendNotification(
      subscription as webpush.PushSubscription,
      JSON.stringify(data)
    );
    console.log(`✅ 알림 발송 성공: ${data.title}`);
  } catch (error) {
    console.error("❌ 알림 발송 실패:", error);
  }
}

Deno.serve(async (_req: Request) => {
  try {
    console.log("=== 가격 체크 시작 ===");

    const { data: holdings, error } = await supabase
      .from("holdings")
      .select("*");

    if (error) throw error;

    if (!holdings?.length) {
      return new Response(JSON.stringify({ message: "No holdings found" }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // 종목별 1번만 API 호출
    const symbols = [
      ...new Set(holdings.map((h: Record<string, unknown>) => h.symbol as string)),
    ];
    const prices: Record<string, number> = {};

    for (const symbol of symbols) {
      try {
        prices[symbol] = await getYahooPrice(symbol);
        console.log(`${symbol} 현재가: ${prices[symbol]}`);
      } catch (err) {
        console.error(`${symbol} 가격 조회 실패:`, err);
        prices[symbol] = 0;
      }
    }

    for (const holding of holdings) {
      const currentPrice = prices[holding.symbol as string];
      if (!currentPrice) continue;

      const defenseLine = Number(holding.defense_line);
      const highestPrice = Number(holding.highest_price);

      // 최고가 갱신
      if (currentPrice > highestPrice) {
        const newDefenseLine = Math.round(
          currentPrice * (1 - Number(holding.trailing_pct) / 100)
        );

        await supabase
          .from("holdings")
          .update({
            highest_price: currentPrice,
            defense_line: newDefenseLine,
          })
          .eq("id", holding.id);

        await sendPush(holding.push_subscription, {
          title: `${holding.name} 방어선 상향`,
          body: `방어선이 ${newDefenseLine.toLocaleString()}원으로 올라갔습니다 ✅`,
        });

        console.log(`✅ ${holding.name} 방어선 상향 → ${newDefenseLine}`);
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
    const logEntries = Object.entries(prices)
      .filter(([, price]) => price > 0)
      .map(([symbol, price]) => ({ symbol, price }));

    if (logEntries.length > 0) {
      await supabase.from("price_logs").insert(logEntries);
    }

    console.log("=== 완료 ===");

    return new Response(
      JSON.stringify({ success: true, symbols: symbols.length, prices }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Fatal error:", error);
    return new Response(JSON.stringify({ error: String(error) }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
