'use client';

import { useEffect, useState } from 'react';
import { useRouter, useParams } from 'next/navigation';
import { ChevronLeft, Trash2, Pencil } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { toast } from 'sonner';
import type { BuyReasonCategory, Holding, PriceData } from '@/lib/types';

const TRAILING_OPTIONS = [10, 15, 20] as const;
const CATEGORY_OPTIONS: BuyReasonCategory[] = [
  '실적호조',
  '테마모멘텀',
  '수출증가',
  '기타',
];

function formatKRW(n: number) {
  return n.toLocaleString('ko-KR') + '원';
}

function formatPct(n: number) {
  return (n >= 0 ? '+' : '') + n.toFixed(2) + '%';
}

function Row({ label, value, valueClass }: { label: string; value: string; valueClass?: string }) {
  return (
    <div className="flex justify-between items-center py-3 border-b border-border/50 last:border-0">
      <span className="text-sm text-muted-foreground">{label}</span>
      <span className={`text-sm font-medium ${valueClass ?? ''}`}>{value}</span>
    </div>
  );
}

export default function HoldingDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [holding, setHolding] = useState<Holding | null>(null);
  const [priceData, setPriceData] = useState<PriceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const [editOpen, setEditOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editBuyPrice, setEditBuyPrice] = useState('');
  const [editQuantity, setEditQuantity] = useState('');
  const [editTrailingPct, setEditTrailingPct] = useState<number>(10);
  const [editCustomTrailing, setEditCustomTrailing] = useState('');
  const [editCategory, setEditCategory] = useState<BuyReasonCategory>('실적호조');
  const [editMemo, setEditMemo] = useState('');

  useEffect(() => {
    const subStr = localStorage.getItem('pushSubscription');
    if (!subStr) {
      router.replace('/onboarding');
      return;
    }

    const sub = JSON.parse(subStr);
    const endpoint: string = sub.endpoint;

    async function load() {
      try {
        const res = await fetch(
          `/api/holdings?endpoint=${encodeURIComponent(endpoint)}`
        );
        const data: Holding[] = await res.json();
        const found = data.find((h) => h.id === id);
        if (!found) {
          router.replace('/');
          return;
        }
        setHolding(found);

        const pr = await fetch(`/api/price?symbol=${found.symbol}`);
        if (pr.ok) setPriceData(await pr.json());
      } finally {
        setLoading(false);
      }
    }

    load();
  }, [id, router]);

  function openEdit() {
    if (!holding) return;
    setEditBuyPrice(String(holding.buy_price));
    setEditQuantity(holding.quantity != null ? String(holding.quantity) : '');
    setEditTrailingPct(holding.trailing_pct);
    setEditCustomTrailing(
      (TRAILING_OPTIONS as readonly number[]).includes(holding.trailing_pct)
        ? ''
        : String(holding.trailing_pct)
    );
    setEditCategory((holding.buy_reason_category as BuyReasonCategory) || '실적호조');
    setEditMemo(holding.buy_reason_memo || '');
    setEditOpen(true);
  }

  async function handleSave() {
    if (!holding) return;
    if (!editBuyPrice || Number(editBuyPrice) <= 0) {
      toast.error('매입가를 올바르게 입력해주세요');
      return;
    }
    if (!(editTrailingPct > 0 && editTrailingPct < 100)) {
      toast.error('추적 비율은 0~100% 사이로 입력해주세요');
      return;
    }

    setSaving(true);
    try {
      const res = await fetch(`/api/holdings/${holding.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          buy_price: Number(editBuyPrice),
          quantity: editQuantity ? Number(editQuantity) : null,
          trailing_pct: editTrailingPct,
          buy_reason_category: editCategory,
          buy_reason_memo: editMemo || null,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      const updated: Holding = await res.json();
      setHolding(updated);
      toast.success('수정되었습니다');
      setEditOpen(false);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : '수정에 실패했습니다');
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!holding) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/holdings/${holding.id}`, { method: 'DELETE' });
      if (!res.ok) throw new Error();
      toast.success('종목이 삭제되었습니다');
      router.push('/');
    } catch {
      toast.error('삭제에 실패했습니다');
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <p className="text-sm text-muted-foreground">불러오는 중...</p>
      </div>
    );
  }

  if (!holding) return null;

  const currentPrice = priceData?.price;
  const isMarketOpen = priceData?.isMarketOpen;

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
    <div className="flex flex-col min-h-screen">
      {/* 헤더 */}
      <header className="flex items-center justify-between px-4 pt-12 pb-4">
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9"
            onClick={() => router.back()}
          >
            <ChevronLeft className="w-5 h-5" />
          </Button>
          <div>
            <h1 className="text-base font-bold leading-tight">{holding.name}</h1>
            <p className="text-xs text-muted-foreground">
              {holding.symbol.replace('.KS', '')}
            </p>
          </div>
        </div>
        <Badge variant="secondary" className="text-xs">
          -{holding.trailing_pct}%
        </Badge>
      </header>

      <main className="flex-1 px-5 pb-8 space-y-5">
        {/* 현재가 카드 */}
        <div className="rounded-2xl bg-secondary/40 p-5 space-y-4">
          <div className="space-y-0.5">
            {currentPrice != null ? (
              <div className="flex items-baseline gap-2">
                <p className="text-3xl font-bold tracking-tight">
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
              <p className="text-2xl font-bold text-muted-foreground">
                {isMarketOpen === false ? '장 마감' : '-'}
              </p>
            )}
            <p className="text-xs text-muted-foreground">15분 지연</p>
          </div>

          {/* 프로그레스바 */}
          {progressPct != null && (
            <div className="space-y-2">
              <Progress
                value={progressPct}
                className={`h-2 ${isBreached || isDanger ? '[&>div]:bg-destructive' : isWarning ? '[&>div]:bg-amber-500' : ''}`}
              />
              <div className="flex justify-between text-xs">
                <div className="text-center">
                  <p className="text-muted-foreground">방어선</p>
                  <p
                    className={`font-medium mt-0.5 ${isBreached || isDanger ? 'text-destructive' : isWarning ? 'text-amber-600' : ''}`}
                  >
                    {formatKRW(holding.defense_line)}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">남은거리</p>
                  <p
                    className={`font-medium mt-0.5 ${isBreached || isDanger ? 'text-destructive' : isWarning ? 'text-amber-600' : ''}`}
                  >
                    {distancePct != null ? formatPct(distancePct) : '-'}
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground">최고가</p>
                  <p className="font-medium mt-0.5">{formatKRW(holding.highest_price)}</p>
                </div>
              </div>
            </div>
          )}

          {isBreached && (
            <div className="rounded-lg bg-destructive/10 px-3 py-2">
              <p className="text-xs text-destructive font-medium">
                방어선 이탈 — 원칙이 작동했습니다
              </p>
            </div>
          )}
        </div>

        {/* 종목 정보 */}
        <div className="rounded-2xl bg-secondary/40 px-5 py-1">
          <Row label="매입가" value={formatKRW(holding.buy_price)} />
          {holding.quantity && (
            <Row label="수량" value={holding.quantity.toLocaleString('ko-KR') + '주'} />
          )}
          {holding.quantity && (
            <Row
              label="평가금액"
              value={
                currentPrice != null
                  ? formatKRW(Math.round(currentPrice * holding.quantity))
                  : '—'
              }
            />
          )}
          <Row label="최고가" value={formatKRW(holding.highest_price)} />
          <Row label="방어선" value={formatKRW(holding.defense_line)} />
          <Row
            label="등록일"
            value={new Date(holding.created_at).toLocaleDateString('ko-KR')}
          />
        </div>

        {/* 매수 이유 */}
        {(holding.buy_reason_category || holding.buy_reason_memo) && (
          <div className="rounded-2xl bg-secondary/40 px-5 py-4 space-y-2">
            <p className="text-xs text-muted-foreground font-medium">매수 이유</p>
            {holding.buy_reason_category && (
              <Badge variant="secondary">{holding.buy_reason_category}</Badge>
            )}
            {holding.buy_reason_memo && (
              <p className="text-sm leading-relaxed">{holding.buy_reason_memo}</p>
            )}
          </div>
        )}

        {/* 수정 버튼 */}
        <Button
          variant="outline"
          className="w-full rounded-xl"
          onClick={openEdit}
        >
          <Pencil className="w-4 h-4 mr-2" />
          종목 정보 수정
        </Button>

        <Dialog open={editOpen} onOpenChange={setEditOpen}>
          <DialogContent className="rounded-2xl mx-4 w-auto max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>종목 정보 수정</DialogTitle>
              <DialogDescription>
                매입가, 수량, 추적 비율, 매수 이유를 수정할 수 있습니다.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-5 py-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">매입가 (원)</label>
                <Input
                  value={editBuyPrice}
                  onChange={(e) => setEditBuyPrice(e.target.value.replace(/\D/g, ''))}
                  className="rounded-xl"
                  inputMode="numeric"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">
                  수량 <span className="text-muted-foreground font-normal">(선택)</span>
                </label>
                <Input
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(e.target.value.replace(/\D/g, ''))}
                  className="rounded-xl"
                  inputMode="numeric"
                />
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">추적 비율</label>
                <div className="grid grid-cols-3 gap-2">
                  {TRAILING_OPTIONS.map((pct) => (
                    <button
                      key={pct}
                      onClick={() => {
                        setEditTrailingPct(pct);
                        setEditCustomTrailing('');
                      }}
                      className={`rounded-xl py-3 text-sm font-medium transition-colors border ${
                        editTrailingPct === pct && !editCustomTrailing
                          ? 'bg-primary text-primary-foreground border-primary'
                          : 'bg-secondary/40 border-transparent hover:bg-secondary/70'
                      }`}
                    >
                      -{pct}%
                    </button>
                  ))}
                </div>
                <div className="flex items-center gap-2">
                  <Input
                    placeholder="직접 입력"
                    value={editCustomTrailing}
                    onChange={(e) => {
                      const raw = e.target.value.replace(/[^\d.]/g, '');
                      const parts = raw.split('.');
                      const cleaned =
                        parts.length > 2 ? `${parts[0]}.${parts.slice(1).join('')}` : raw;
                      setEditCustomTrailing(cleaned);
                      const num = Number(cleaned);
                      if (cleaned && !Number.isNaN(num) && num > 0 && num < 100) {
                        setEditTrailingPct(num);
                      }
                    }}
                    className={`rounded-xl w-28 ${editCustomTrailing ? 'border-primary' : ''}`}
                    inputMode="decimal"
                  />
                  <span className="text-sm text-muted-foreground">% (예: 7.5)</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  방어선 = 현재 최고가({formatKRW(holding.highest_price)}) × (1 −{' '}
                  {editTrailingPct}%) ={' '}
                  {Math.round(
                    holding.highest_price * (1 - editTrailingPct / 100)
                  ).toLocaleString('ko-KR')}
                  원
                </p>
              </div>

              <div className="space-y-3">
                <label className="text-sm font-medium">매수 이유</label>
                <div className="grid grid-cols-2 gap-2">
                  {CATEGORY_OPTIONS.map((c) => (
                    <button
                      key={c}
                      onClick={() => setEditCategory(c)}
                      className={`rounded-xl py-2.5 text-sm font-medium transition-colors border ${
                        editCategory === c
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
                  value={editMemo}
                  onChange={(e) => setEditMemo(e.target.value)}
                  rows={3}
                  className="w-full rounded-xl border border-input bg-background px-3 py-2.5 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring resize-none"
                />
              </div>
            </div>

            <DialogFooter className="flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setEditOpen(false)}
              >
                취소
              </Button>
              <Button
                className="flex-1 rounded-xl"
                onClick={handleSave}
                disabled={saving}
              >
                {saving ? '저장 중...' : '저장'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 삭제 버튼 */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button
              variant="outline"
              className="w-full rounded-xl text-destructive border-destructive/30 hover:bg-destructive/5 hover:text-destructive"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              종목 삭제
            </Button>
          </DialogTrigger>
          <DialogContent className="rounded-2xl mx-4 w-auto">
            <DialogHeader>
              <DialogTitle>종목 삭제</DialogTitle>
              <DialogDescription>
                {holding.name}을(를) 삭제하면 방어선 알림도 중단됩니다.
                계속하시겠습니까?
              </DialogDescription>
            </DialogHeader>
            <DialogFooter className="flex-row gap-2">
              <Button
                variant="outline"
                className="flex-1 rounded-xl"
                onClick={() => setDialogOpen(false)}
              >
                취소
              </Button>
              <Button
                variant="destructive"
                className="flex-1 rounded-xl"
                onClick={handleDelete}
                disabled={deleting}
              >
                {deleting ? '삭제 중...' : '삭제'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
