'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronLeft, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import type { BuyReasonCategory } from '@/lib/types';

const TRAILING_OPTIONS = [10, 15, 20] as const;
const CATEGORY_OPTIONS: BuyReasonCategory[] = [
  '실적호조',
  '테마모멘텀',
  '수출증가',
  '기타',
];

export default function AddPage() {
  const router = useRouter();

  const [code, setCode] = useState('');
  const [fetchedName, setFetchedName] = useState('');
  const [fetchedSymbol, setFetchedSymbol] = useState('');
  const [lookupLoading, setLookupLoading] = useState(false);

  const [buyPrice, setBuyPrice] = useState('');
  const [quantity, setQuantity] = useState('');
  const [trailingPct, setTrailingPct] = useState<10 | 15 | 20>(10);
  const [category, setCategory] = useState<BuyReasonCategory>('실적호조');
  const [memo, setMemo] = useState('');

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const sub = localStorage.getItem('pushSubscription');
    if (!sub) router.replace('/onboarding');
  }, [router]);

  async function handleLookup() {
    const trimmed = code.trim().replace(/\D/g, '');
    if (trimmed.length !== 5 && trimmed.length !== 6) {
      toast.error('5~6자리 종목코드를 입력해주세요 (예: 005930)');
      return;
    }

    setLookupLoading(true);
    setFetchedName('');
    setFetchedSymbol('');

    try {
      const symbol = trimmed + '.KS';
      const res = await fetch(`/api/price?symbol=${symbol}`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      if (!data.name || data.price === 0) throw new Error();

      setFetchedName(data.name);
      setFetchedSymbol(symbol);
      if (!buyPrice) setBuyPrice(String(data.price));
      toast.success(`${data.name} 조회됨`);
    } catch {
      toast.error('종목을 찾을 수 없습니다. 코드를 확인해주세요.');
    } finally {
      setLookupLoading(false);
    }
  }

  async function handleSubmit() {
    if (!fetchedSymbol) {
      toast.error('먼저 종목을 조회해주세요');
      return;
    }
    if (!buyPrice || Number(buyPrice) <= 0) {
      toast.error('매입가를 올바르게 입력해주세요');
      return;
    }

    const subStr = localStorage.getItem('pushSubscription');
    if (!subStr) {
      router.replace('/onboarding');
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch('/api/holdings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          symbol: fetchedSymbol,
          name: fetchedName,
          buy_price: Number(buyPrice),
          quantity: quantity ? Number(quantity) : null,
          trailing_pct: trailingPct,
          buy_reason_category: category,
          buy_reason_memo: memo || null,
          push_subscription: JSON.parse(subStr),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      toast.success('종목이 등록되었습니다');
      router.push('/');
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '등록에 실패했습니다');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* 헤더 */}
      <header className="flex items-center gap-2 px-4 pt-12 pb-4">
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9"
          onClick={() => router.back()}
        >
          <ChevronLeft className="w-5 h-5" />
        </Button>
        <h1 className="text-lg font-bold tracking-tight">종목 추가</h1>
      </header>

      <main className="flex-1 px-5 pb-8 space-y-6">
        {/* 종목 조회 */}
        <section className="space-y-3">
          <label className="text-sm font-medium">종목코드</label>
          <div className="flex gap-2">
            <Input
              placeholder="005930"
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
              onKeyDown={(e) => e.key === 'Enter' && handleLookup()}
              className="rounded-xl"
              inputMode="numeric"
            />
            <Button
              variant="outline"
              onClick={handleLookup}
              disabled={lookupLoading || !code}
              className="rounded-xl shrink-0"
            >
              <Search className="w-4 h-4 mr-1.5" />
              {lookupLoading ? '조회 중' : '조회'}
            </Button>
          </div>
          {fetchedName && (
            <div className="rounded-xl bg-secondary/50 px-4 py-3">
              <p className="text-sm font-semibold">{fetchedName}</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                {fetchedSymbol}
              </p>
            </div>
          )}
        </section>

        {/* 매입 정보 */}
        <section className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">매입가 (원)</label>
            <Input
              placeholder="60000"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value.replace(/\D/g, ''))}
              className="rounded-xl"
              inputMode="numeric"
            />
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">
              수량{' '}
              <span className="text-muted-foreground font-normal">(선택)</span>
            </label>
            <Input
              placeholder="10"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value.replace(/\D/g, ''))}
              className="rounded-xl"
              inputMode="numeric"
            />
          </div>
        </section>

        {/* 추적 비율 */}
        <section className="space-y-3">
          <label className="text-sm font-medium">추적 비율</label>
          <div className="grid grid-cols-3 gap-2">
            {TRAILING_OPTIONS.map((pct) => (
              <button
                key={pct}
                onClick={() => setTrailingPct(pct)}
                className={`rounded-xl py-3 text-sm font-medium transition-colors border ${
                  trailingPct === pct
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary/40 border-transparent hover:bg-secondary/70'
                }`}
              >
                -{pct}%
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground">
            방어선 = 최고가 × (1 − {trailingPct}%) ={' '}
            {buyPrice
              ? Math.round(Number(buyPrice) * (1 - trailingPct / 100)).toLocaleString('ko-KR') + '원'
              : '—'}
          </p>
        </section>

        {/* 매수 이유 */}
        <section className="space-y-3">
          <label className="text-sm font-medium">매수 이유</label>
          <div className="grid grid-cols-2 gap-2">
            {CATEGORY_OPTIONS.map((c) => (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-xl py-2.5 text-sm font-medium transition-colors border ${
                  category === c
                    ? 'bg-primary text-primary-foreground border-primary'
                    : 'bg-secondary/40 border-transparent hover:bg-secondary/70'
                }`}
              >
                {c}
              </button>
            ))}
          </div>
          <textarea
            placeholder="추가 메모 (선택)"
            value={memo}
            onChange={(e) => setMemo(e.target.value)}
            rows={3}
            className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
          />
        </section>

        {/* 등록 버튼 */}
        <Button
          onClick={handleSubmit}
          disabled={submitting || !fetchedSymbol || !buyPrice}
          className="w-full h-12 text-base font-medium rounded-xl"
        >
          {submitting ? '등록 중...' : '등록하기'}
        </Button>
      </main>
    </div>
  );
}
