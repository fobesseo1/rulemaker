'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import type { Holding, PriceData } from '@/lib/types';

function formatKRW(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

function formatPct(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function HoldingCardSkeleton() {
  return (
    <div className="rounded-2xl bg-secondary/50 p-5 space-y-4 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-2">
          <div className="h-4 w-24 bg-secondary rounded" />
          <div className="h-3 w-16 bg-secondary rounded" />
        </div>
        <div className="h-6 w-16 bg-secondary rounded-full" />
      </div>
      <div className="h-8 w-32 bg-secondary rounded" />
      <div className="h-2 bg-secondary rounded-full" />
      <div className="grid grid-cols-3 gap-2">
        {[0, 1, 2].map((i) => (
          <div key={i} className="space-y-1">
            <div className="h-3 w-12 bg-secondary rounded" />
            <div className="h-4 w-16 bg-secondary rounded" />
          </div>
        ))}
      </div>
    </div>
  );
}

interface HoldingWithPrice extends Holding {
  currentPrice?: number;
  isMarketOpen?: boolean;
}

function HoldingCard({ holding }: { holding: HoldingWithPrice }) {
  const { currentPrice, isMarketOpen } = holding;

  const profitPct =
    currentPrice != null
      ? ((currentPrice - holding.buy_price) / holding.buy_price) * 100
      : null;

  const distancePct =
    currentPrice != null
      ? ((currentPrice - holding.defense_line) / currentPrice) * 100
      : null;

  const progressPct =
    currentPrice != null && holding.highest_price > holding.defense_line
      ? Math.max(
          0,
          Math.min(
            100,
            ((currentPrice - holding.defense_line) /
              (holding.highest_price - holding.defense_line)) *
              100
          )
        )
      : null;

  const isBreached = distancePct != null && distancePct < 0;
  const isDanger = distancePct != null && distancePct >= 0 && distancePct < 5;
  const isWarning = distancePct != null && distancePct >= 5 && distancePct < 10;

  return (
    <Link href={`/holdings/${holding.id}`}>
      <Card className="border-0 shadow-none bg-secondary/40 rounded-2xl hover:bg-secondary/60 transition-colors cursor-pointer">
        <CardContent className="p-5 space-y-4">
          {/* 헤더 */}
          <div className="flex justify-between items-start">
            <div>
              <p className="font-semibold text-sm">{holding.name}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {holding.symbol.replace('.KS', '')}
              </p>
            </div>
            <Badge variant="secondary" className="text-xs">
              -{holding.trailing_pct}%
            </Badge>
          </div>

          {/* 현재가 */}
          <div className="space-y-0.5">
            {currentPrice != null ? (
              <div className="flex items-baseline gap-2">
                <p className="text-2xl font-bold tracking-tight">
                  {formatKRW(currentPrice)}
                </p>
                {profitPct != null && (
                  <span
                    className={`text-sm font-medium ${profitPct >= 0 ? '' : 'text-destructive'}`}
                  >
                    {formatPct(profitPct)}
                  </span>
                )}
              </div>
            ) : (
              <p className="text-lg font-bold text-muted-foreground">
                {isMarketOpen === false ? '장 마감' : '-'}
              </p>
            )}
            <p className="text-xs text-muted-foreground">15분 지연</p>
          </div>

          {/* 프로그레스바 */}
          {progressPct != null && (
            <div className="space-y-1.5">
              <Progress
                value={progressPct}
                className={`h-1.5 ${isBreached || isDanger ? '[&>div]:bg-destructive' : isWarning ? '[&>div]:bg-amber-500' : ''}`}
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>방어선</span>
                <span>최고가</span>
              </div>
            </div>
          )}

          {/* 주요 지표 */}
          <div className="grid grid-cols-3 gap-3 pt-1 border-t border-border/50">
            <div>
              <p className="text-xs text-muted-foreground">매입가</p>
              <p className="text-xs font-medium mt-0.5">
                {formatKRW(holding.buy_price)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">방어선</p>
              <p
                className={`text-xs font-medium mt-0.5 ${isBreached || isDanger ? 'text-destructive' : isWarning ? 'text-amber-600' : ''}`}
              >
                {formatKRW(holding.defense_line)}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">남은거리</p>
              <p
                className={`text-xs font-medium mt-0.5 ${isBreached || isDanger ? 'text-destructive' : isWarning ? 'text-amber-600' : ''}`}
              >
                {distancePct != null ? formatPct(distancePct) : '-'}
              </p>
            </div>
          </div>

          {isBreached && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2">
              <p className="text-xs text-destructive font-medium">
                방어선 이탈 — 원칙이 작동했습니다
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

// 서비스워커의 현재 구독과 localStorage 구독을 비교해서 다르면 DB 자동 업데이트
async function syncSubscriptionIfChanged(storedEndpoint: string): Promise<string> {
  try {
    const reg = await navigator.serviceWorker.getRegistration('/sw.js');
    if (!reg) return storedEndpoint;

    const currentSub = await reg.pushManager.getSubscription();
    if (!currentSub) return storedEndpoint;

    const currentJson = JSON.parse(JSON.stringify(currentSub));
    const currentEndpoint: string = currentJson.endpoint;

    if (currentEndpoint !== storedEndpoint) {
      await fetch('/api/holdings/subscription', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ old_endpoint: storedEndpoint, new_subscription: currentJson }),
      });
      localStorage.setItem('pushSubscription', JSON.stringify(currentJson));
      return currentEndpoint;
    }
  } catch {
    // 실패 시 기존 endpoint 유지
  }
  return storedEndpoint;
}

export default function DashboardPage() {
  const router = useRouter();
  const [holdings, setHoldings] = useState<HoldingWithPrice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = useCallback(
    async (showRefreshing = false) => {
      const subStr = localStorage.getItem('pushSubscription');
      if (!subStr) {
        router.replace('/onboarding');
        return;
      }

      const stored = JSON.parse(subStr);
      // 구독이 변경됐으면 DB 업데이트 후 새 endpoint 반환
      const endpoint: string = await syncSubscriptionIfChanged(stored.endpoint);

      if (showRefreshing) setRefreshing(true);
      else setLoading(true);

      try {
        const res = await fetch(
          `/api/holdings?endpoint=${encodeURIComponent(endpoint)}`
        );
        const data: Holding[] = await res.json();

        const symbols = [...new Set(data.map((h) => h.symbol))];
        const priceMap: Record<string, PriceData> = {};

        await Promise.allSettled(
          symbols.map(async (symbol) => {
            const r = await fetch(`/api/price?symbol=${symbol}`);
            if (r.ok) {
              priceMap[symbol] = await r.json();
            }
          })
        );

        const enriched: HoldingWithPrice[] = data.map((h) => ({
          ...h,
          currentPrice: priceMap[h.symbol]?.price,
          isMarketOpen: priceMap[h.symbol]?.isMarketOpen,
        }));

        setHoldings(enriched);
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    },
    [router]
  );

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return (
    <div className="flex flex-col min-h-screen">
      <header className="flex items-center justify-between px-5 pt-12 pb-4">
        <h1 className="text-xl font-bold tracking-tight">내 방어선</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`}
            />
          </Button>
          <Link href="/add">
            <Button size="icon" className="h-9 w-9 rounded-xl">
              <Plus className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 px-5 pb-8 space-y-3">
        {loading ? (
          <>
            <HoldingCardSkeleton />
            <HoldingCardSkeleton />
          </>
        ) : holdings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <p className="text-sm text-muted-foreground">
              등록된 종목이 없습니다
            </p>
            <Link href="/add">
              <Button variant="outline" size="sm" className="rounded-xl">
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                종목 추가
              </Button>
            </Link>
          </div>
        ) : (
          holdings.map((h) => <HoldingCard key={h.id} holding={h} />)
        )}
      </main>
    </div>
  );
}
