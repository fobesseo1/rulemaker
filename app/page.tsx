'use client';

import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Plus, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Holding, PriceData } from '@/lib/types';

function formatKRW(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

function formatPct(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function HoldingCardSkeleton() {
  return (
    <div className="rounded-[2rem] bg-secondary/30 border border-border/5 p-6 space-y-6 animate-pulse">
      <div className="flex justify-between items-start">
        <div className="space-y-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-20 bg-secondary/60 rounded-md" />
            <div className="h-5 w-12 bg-secondary/60 rounded-full" />
          </div>
          <div className="h-4 w-32 bg-secondary/60 rounded-md" />
        </div>
        <div className="flex flex-col items-end space-y-2">
          <div className="h-9 w-28 bg-secondary/60 rounded-md" />
          <div className="h-6 w-16 bg-secondary/60 rounded-full" />
        </div>
      </div>
      <div className="space-y-2.5">
        <div className="flex justify-between">
          <div className="h-3 w-20 bg-secondary/60 rounded-md" />
          <div className="h-3 w-20 bg-secondary/60 rounded-md" />
        </div>
        <div className="h-2.5 bg-secondary/60 rounded-full" />
      </div>
      <div className="flex justify-between pt-1">
        <div className="space-y-2">
          <div className="h-3 w-12 bg-secondary/60 rounded-md" />
          <div className="h-4 w-20 bg-secondary/60 rounded-md" />
        </div>
        <div className="space-y-2 items-end flex flex-col">
          <div className="h-3 w-16 bg-secondary/60 rounded-md" />
          <div className="h-4 w-16 bg-secondary/60 rounded-md" />
        </div>
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

  const bgClass = isBreached
    ? 'bg-destructive/10 border-destructive/20'
    : isDanger
      ? 'bg-red-500/5 border-red-500/10'
      : 'bg-secondary/40 border-border/5 hover:bg-secondary/60';

  const badgeClass =
    profitPct != null && profitPct >= 0
      ? 'bg-green-500/15 text-green-600 dark:text-green-400'
      : 'bg-destructive/15 text-destructive';

  return (
    <Link href={`/holdings/${holding.id}`} className="block">
      <Card
        className={`border shadow-none rounded-[2rem] transition-all duration-300 transform hover:scale-[1.01] active:scale-[0.98] ${bgClass}`}
      >
        <CardContent className="p-6 space-y-6">
          {/* 상단: 헤더 및 현재가 영역 */}
          <div className="flex justify-between items-start">
            <div className="flex flex-col">
              <div className="flex items-center gap-2">
                <h2 className="text-2xl font-bold tracking-tight">
                  {holding.symbol.replace('.KS', '')}
                </h2>
                <Badge
                  variant="secondary"
                  className="px-2 py-0.5 rounded-full text-[10px] font-semibold opacity-80"
                >
                  -{holding.trailing_pct}%
                </Badge>
              </div>
              <p className="text-sm text-muted-foreground font-medium mt-1">
                {holding.name}
              </p>
            </div>

            <div className="flex flex-col items-end">
              {currentPrice != null ? (
                <>
                  <p className="text-3xl font-bold tracking-tighter">
                    {formatKRW(currentPrice)}
                  </p>
                  {profitPct != null && (
                    <div
                      className={`mt-1.5 px-2.5 py-1 rounded-full text-xs font-bold leading-none ${badgeClass}`}
                    >
                      {formatPct(profitPct)}
                    </div>
                  )}
                </>
              ) : (
                <div className="flex flex-col items-end">
                  <p className="text-xl font-bold text-muted-foreground">
                    {isMarketOpen === false ? '장 마감' : '-'}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    15분 지연
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* 중단: 방어선 진행 게이지 바 */}
          {progressPct != null ? (
            <div className="space-y-2.5">
              <div className="flex justify-between text-[11px] font-medium text-muted-foreground opacity-80 px-1">
                <span>방어선 {formatKRW(holding.defense_line)}</span>
                <span>최고가 {formatKRW(holding.highest_price)}</span>
              </div>
              <div className="relative h-2.5 w-full bg-black/5 dark:bg-white/10 rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full rounded-full transition-all duration-500 ease-out ${isBreached || isDanger
                      ? 'bg-destructive'
                      : isWarning
                        ? 'bg-amber-500'
                        : 'bg-primary/80'
                    }`}
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            </div>
          ) : (
            <div className="h-px w-full bg-border/50" />
          )}

          {/* 하단: 핵심 세부 수치 */}
          <div className="flex items-center justify-between pt-1">
            <div>
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-80">
                매입가
              </p>
              <p className="text-sm font-semibold mt-1">
                {formatKRW(holding.buy_price)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest opacity-80">
                방어선까지
              </p>
              <p
                className={`text-sm font-bold mt-1 ${isBreached || isDanger
                    ? 'text-destructive'
                    : isWarning
                      ? 'text-amber-500'
                      : ''
                  }`}
              >
                {distancePct != null ? formatPct(distancePct) : '-'}
              </p>
            </div>
          </div>

          {/* 이탈 알림 상태 창 */}
          {isBreached && (
            <div className="mt-2 rounded-2xl bg-destructive/15 px-4 py-3.5 flex items-center justify-center">
              <p className="text-sm text-destructive font-bold tracking-tight">
                원칙이 작동했습니다 (방어선 이탈)
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </Link>
  );
}

// 서비스워커의 현재 구독과 localStorage 구독을 비교해서 다르면 DB 자동 업데이트
async function syncSubscriptionIfChanged(
  storedEndpoint: string
): Promise<string> {
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
        body: JSON.stringify({
          old_endpoint: storedEndpoint,
          new_subscription: currentJson,
        }),
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
      <header className="flex items-end justify-between px-6 pt-16 pb-6">
        <h1 className="text-3xl font-extrabold tracking-tight">내 방어선</h1>
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-10 w-10 rounded-full hover:bg-secondary/60"
            onClick={() => fetchData(true)}
            disabled={refreshing}
          >
            <RefreshCw
              className={`w-5 h-5 text-foreground/80 ${refreshing ? 'animate-spin' : ''
                }`}
            />
          </Button>
          <Link href="/add">
            <Button size="icon" className="h-10 w-10 rounded-full bg-foreground text-background hover:bg-foreground/90 transition-transform active:scale-95">
              <Plus className="w-5 h-5" />
            </Button>
          </Link>
        </div>
      </header>

      <main className="flex-1 px-6 pb-12 space-y-5">
        {loading ? (
          <>
            <HoldingCardSkeleton />
            <HoldingCardSkeleton />
          </>
        ) : holdings.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-5">
            <div className="w-16 h-16 rounded-full bg-secondary/80 flex items-center justify-center mb-2">
              <Plus className="w-8 h-8 text-muted-foreground opacity-50" />
            </div>
            <p className="text-base text-muted-foreground font-medium">
              등록된 종목이 없습니다
            </p>
            <Link href="/add">
              <Button
                variant="default"
                size="lg"
                className="rounded-full px-8 font-bold h-12 shadow-sm"
              >
                <Plus className="w-4 h-4 mr-2" />
                종목 추가하기
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

