-- Marbull 제너러티브 코인 플랫폼 초기화 SQL 스크립트

-- 1. [테이블 생성] 코인 컬렉션 목록
CREATE TABLE IF NOT EXISTS public.collections (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. [테이블 생성] 각 컬렉션 내 레이어(Z-Index 포함) 관리
CREATE TABLE IF NOT EXISTS public.layers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  collection_id UUID REFERENCES public.collections(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  z_index INTEGER NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. [테이블 생성] 각 레이어에 귀속된 파츠들 (확률 및 이미지 주소 포함)
CREATE TABLE IF NOT EXISTS public.parts (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  layer_id UUID REFERENCES public.layers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  probability_percent NUMERIC NOT NULL DEFAULT 0, -- 0~100 사이
  image_url TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. [보안 설정] (선택 사항 - 현재는 MVP용도로 누구나 읽기 가능하게 설정, 필요시 RLS 활성화)
-- ALTER TABLE public.collections ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY "Enable public read access" ON public.collections FOR SELECT USING (true);
-- (이 프로젝트는 Server/Admin은 Service Role을 쓰고, Client는 무상태 API가 돌려준 JSON만 보므로 일단 RLS 정책을 생략하거나 단순하게 유지)


-- 5. [Storage 버킷 생성] WebP 처리된 파츠들이 업로드될 'coin-parts' 스토리지
insert into storage.buckets (id, name, public) 
values ('coin-parts', 'coin-parts', true)
on conflict (id) do nothing;

-- 누구나 'coin-parts' 버킷의 이미지를 읽을 수 있도록 정책 추가
create policy "Public Access"
  on storage.objects for select
  using ( bucket_id = 'coin-parts' );

-- (주의: 실제 프로덕션 적용 시 위 'coin-parts' 버킷에 쓰기(Insert) 권한은 서비스의 정책(인증된 관리자만)에 맞춰 조정해주세요.
-- 기본적으로 Service Role Key를 사용하면 Storage RLS를 우회합니다.)
