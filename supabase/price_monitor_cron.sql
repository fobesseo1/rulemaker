-- ============================================================
-- price-monitor Edge Function 자동 실행 스케줄 (pg_cron)
--
-- 이 SQL은 Supabase 프로젝트(blesserItem, ref: crhlrcgenhenzlddrvfv)에
-- 이미 등록되어 실행 중인 pg_cron 잡을 "기록"하기 위한 문서입니다.
-- Supabase 대시보드(SQL Editor)에서 직접 등록되었고 git에는 남아있지 않아서
-- 2026-08-24 세션에서 조회해서 백업해둡니다.
--
-- 재현/재설정이 필요할 경우 아래를 그대로 실행하면 됩니다.
-- (관련 Edge Function 코드: supabase/functions/price-monitor/index.ts)
-- ============================================================

-- 사용 익스텐션 (이미 설치되어 있음)
-- create extension if not exists pg_cron;
-- create extension if not exists pg_net;

select cron.schedule(
  'price-monitor-hourly',
  '0 0-6 * * 1-5', -- UTC 기준: 00~06시, 월~금 => KST 09:00~15:00 (한국 장중), 매시 정각
  $$
  SELECT net.http_post(
    url     := 'https://crhlrcgenhenzlddrvfv.supabase.co/functions/v1/price-monitor',
    headers := '{"Content-Type": "application/json"}'::jsonb,
    body    := '{}'::jsonb
  ) AS request_id;
  $$
);

-- 현재 등록된 잡 확인
-- select jobid, jobname, schedule, active from cron.job;

-- 최근 실행 이력 확인
-- select jobid, status, return_message, start_time, end_time
-- from cron.job_run_details
-- order by start_time desc
-- limit 20;

-- 잡 삭제가 필요할 경우
-- select cron.unschedule('price-monitor-hourly');
