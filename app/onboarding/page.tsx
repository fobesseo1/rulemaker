'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { BellRing, Shield, TrendingDown } from 'lucide-react';

export default function OnboardingPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function handleSetup() {
    setLoading(true);
    try {
      if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
        toast.error('이 브라우저는 Web Push를 지원하지 않습니다');
        return;
      }

      const reg = await navigator.serviceWorker.register('/sw.js');

      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        toast.error('알림 권한이 필요합니다. 브라우저 설정에서 허용해주세요.');
        return;
      }

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY,
      });

      localStorage.setItem('pushSubscription', JSON.stringify(sub));
      toast.success('설정 완료');
      router.replace('/');
    } catch (e) {
      console.error(e);
      toast.error('설정 중 오류가 발생했습니다');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col min-h-screen px-6 py-12">
      <div className="flex-1 flex flex-col justify-center gap-10">
        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight">RuleMaker</h1>
          <p className="text-muted-foreground text-sm leading-relaxed">
            손실 회피 심리를 차단하는 트레일링 스탑 알림 앱
          </p>
        </div>

        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <TrendingDown className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium">방어선 자동 추적</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                최고가 기준으로 방어선이 자동으로 올라갑니다
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <BellRing className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium">즉각적인 알림</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                방어선 이탈 시 실시간으로 폰에 알림을 보냅니다
              </p>
            </div>
          </div>

          <div className="flex items-start gap-4">
            <div className="w-9 h-9 rounded-xl bg-secondary flex items-center justify-center shrink-0">
              <Shield className="w-4 h-4" />
            </div>
            <div>
              <p className="text-sm font-medium">원칙 있는 매도</p>
              <p className="text-xs text-muted-foreground mt-0.5">
                감정이 아닌 규칙이 매도 타이밍을 알려줍니다
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="space-y-3 pt-6">
        <Button
          onClick={handleSetup}
          disabled={loading}
          className="w-full h-12 text-base font-medium"
        >
          {loading ? '설정 중...' : '알림 허용하고 시작하기'}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          알림 권한은 방어선 이탈 시 알림 발송에만 사용됩니다
        </p>
      </div>
    </div>
  );
}
