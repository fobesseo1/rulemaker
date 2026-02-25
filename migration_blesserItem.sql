-- ============================================================
-- blesserItem 프로젝트 전체 마이그레이션 SQL
-- 원본 Supabase 프로젝트 ID : ijymktztgxzyrnkaflpc
-- 추출 일시                  : 2026-02-25
-- 포함 테이블
--   - public.items      : 19건 (전체)
--   - public.holdings   :  1건 (전체)
--   - public.price_logs :  1건 (전체)
-- ============================================================


-- ============================================================
-- PART 1. 테이블 생성 (DDL)
-- ============================================================

-- ------------------------------------------------------------
-- 1-1. items
--   id          UUID        PK,  DEFAULT gen_random_uuid()
--   owner_id    TEXT        NOT NULL
--   dna_hash    TEXT        NOT NULL, UNIQUE
--   attributes  JSONB       NOT NULL
--     .parts     : { lip, eyes, face, [species] }
--     .urls      : { lip, eyes, face, [species] }  (Storage 공개 URL)
--     .meta      : { rarity, edition }
--     .minted_at : unix timestamp ms
--   created_at  TIMESTAMPTZ NULL,  DEFAULT now()
--
--   인덱스
--     idx_owner_id   BTREE(owner_id)
--     idx_attributes GIN(attributes)
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.items (
  id          UUID        NOT NULL DEFAULT gen_random_uuid(),
  owner_id    TEXT        NOT NULL,
  dna_hash    TEXT        NOT NULL,
  attributes  JSONB       NOT NULL,
  created_at  TIMESTAMPTZ          DEFAULT now(),
  CONSTRAINT items_pkey      PRIMARY KEY (id),
  CONSTRAINT unique_dna_hash UNIQUE      (dna_hash)
);

CREATE INDEX IF NOT EXISTS idx_owner_id   ON public.items USING btree (owner_id);
CREATE INDEX IF NOT EXISTS idx_attributes ON public.items USING gin   (attributes);

-- ------------------------------------------------------------
-- 1-2. holdings
--   id                UUID        PK,  DEFAULT gen_random_uuid()
--   push_subscription JSONB       NOT NULL  (Web Push 구독 정보)
--   symbol            TEXT        NOT NULL  (종목 코드, 예: 005930.KS)
--   name              TEXT        NOT NULL  (종목명)
--   buy_price         NUMERIC     NOT NULL  (매수 단가)
--   highest_price     NUMERIC     NOT NULL  (최고가)
--   defense_line      NUMERIC     NOT NULL  (손절/방어선)
--   trailing_pct      NUMERIC     NOT NULL  (트레일링 스탑 비율 %)
--   created_at        TIMESTAMPTZ NOT NULL, DEFAULT now()
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.holdings (
  id                UUID        NOT NULL DEFAULT gen_random_uuid(),
  push_subscription JSONB       NOT NULL,
  symbol            TEXT        NOT NULL,
  name              TEXT        NOT NULL,
  buy_price         NUMERIC     NOT NULL,
  highest_price     NUMERIC     NOT NULL,
  defense_line      NUMERIC     NOT NULL,
  trailing_pct      NUMERIC     NOT NULL,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT holdings_pkey PRIMARY KEY (id)
);

-- ------------------------------------------------------------
-- 1-3. price_logs
--   id         UUID        PK,  DEFAULT gen_random_uuid()
--   symbol     TEXT        NOT NULL  (종목 코드)
--   price      NUMERIC     NOT NULL  (체크 시점 가격)
--   checked_at TIMESTAMPTZ NOT NULL, DEFAULT now()
-- ------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.price_logs (
  id         UUID        NOT NULL DEFAULT gen_random_uuid(),
  symbol     TEXT        NOT NULL,
  price      NUMERIC     NOT NULL,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT price_logs_pkey PRIMARY KEY (id)
);


-- ============================================================
-- PART 2. 데이터 INSERT
-- ============================================================

-- ------------------------------------------------------------
-- 2-1. holdings (1건)
-- ------------------------------------------------------------
INSERT INTO public.holdings
  (id, push_subscription, symbol, name, buy_price, highest_price, defense_line, trailing_pct, created_at)
VALUES (
  'e3444021-b32e-4e1b-9eef-0510a2314911',
  '{"keys":{"auth":"7ZHIfWyvsoWUcHKNjbmaog","p256dh":"BKItk2eszWqh63uoO1HWKGt_iY1BojUboWHh3UQWf_ku-ijWVuyUkf3TYFi5LtYq4PbX-3I4BkNWlETBsi2Qjx8"},"endpoint":"https://fcm.googleapis.com/fcm/send/f0Gk3XaVc_w:APA91bH4wXqpv4WLdUGiEeBg1oHasZcdL9vq9f6VN902D1ZyEexDH7v8lfjfCKE4wCEl7qw_ihcK_Xj6m1lZcjZIxxFe3sAkAl7fLfE2AcaktHuW62yWLtnukkiY0SKqIrNbnp9puJHW","expirationTime":null}'::jsonb,
  '005930.KS',
  '삼성전자',
  180000,
  230000,
  210000,
  10,
  '2026-02-25 06:27:30.639041+00'
)
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------
-- 2-2. price_logs (1건)
-- ------------------------------------------------------------
INSERT INTO public.price_logs
  (id, symbol, price, checked_at)
VALUES (
  '48f90a08-2e00-4e3d-889d-fd5aa56996fe',
  '005930.KS',
  203250,
  '2026-02-25 06:31:47.589145+00'
)
ON CONFLICT (id) DO NOTHING;


-- ------------------------------------------------------------
-- 2-3. items (19건, created_at 오름차순)
-- 전체 ID 목록 (순서 보장):
--   01. 1c8d3335  02. de786d2f  03. ee52f42e  04. e29efabc
--   05. dbabc94a  06. b398d700  07. 06a63fb3  08. a64e803f
--   09. 7dd245db  10. be94b038  11. 754562a9  12. 1f9d3551
--   13. a5549abd  14. 380b8c09  15. 85a63e29  16. 2eb0936e
--   17. 3e2b52f6  18. 0d9cd2ff  19. c011bbed
-- ------------------------------------------------------------
INSERT INTO public.items (id, owner_id, dna_hash, attributes, created_at) VALUES

-- [01] 2026-02-12 14:43 | lip_normal / eyes_normal / face_normal (png, species 없음)
(
  '1c8d3335-57bb-4ea1-b681-6f0fc2ad80c2',
  'user_test_01',
  '54e12b3a4a5d4ce3afa57fdacd8edc889c3e3c84473838344106a08592649ba5',
  '{"meta":{"rarity":"Common","edition":null},"urls":{"lip":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/lip/lip_normal.png","eyes":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/eyes/eyes_normal.png","face":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/face/face_normal.png"},"parts":{"lip":"lip_normal","eyes":"eyes_normal","face":"face_normal"},"minted_at":1770907390676}'::jsonb,
  '2026-02-12 14:43:11.6415+00'
),

-- [02] 2026-02-12 14:49 | lip_smile / eyes_normal / face_normal (png, species 없음)
(
  'de786d2f-7d93-4dba-8a26-9002c8d02c2c',
  'user_test_01',
  'a1367766cc3d8187a7f110b52a5c413a4b5878824ee9d7f40a0eadbac0fbc618',
  '{"meta":{"rarity":"Common","edition":null},"urls":{"lip":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/lip/lip_smile.png","eyes":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/eyes/eyes_normal.png","face":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/face/face_normal.png"},"parts":{"lip":"lip_smile","eyes":"eyes_normal","face":"face_normal"},"minted_at":1770907762379}'::jsonb,
  '2026-02-12 14:49:23.038777+00'
),

-- [03] 2026-02-13 01:33 | species:turtle / lip_normal / eyes_normal / face_normal (png)
(
  'ee52f42e-0877-47bf-b5ab-612c3e5346c4',
  'user_test_01',
  'acd393bae0e03b5890d12d8b94f220caca09e34559c3c5c1332483da056c9ece',
  '{"meta":{"rarity":"Common","edition":null},"urls":{"lip":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/lip/lip_normal.png","eyes":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/eyes/eyes_normal.png","face":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/face/face_normal.png","species":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/species/species_turtle.png"},"parts":{"lip":"lip_normal","eyes":"eyes_normal","face":"face_normal","species":"turtle"},"minted_at":1770946390839}'::jsonb,
  '2026-02-13 01:33:12.094361+00'
),

-- [04] 2026-02-13 01:40 | species:turtle / lip_normal / eyes_smile / face_normal (webp)
(
  'e29efabc-6a7b-432f-a6c0-c9ef3d025dce',
  'user_test_01',
  'f657ef0c8bde52508a884206d8d8c048c61c7b4cf9f7fe42658d7c0fa4d8b6eb',
  '{"meta":{"rarity":"Common","edition":null},"urls":{"lip":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/lip/turtle_lip_normal.webp","eyes":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/eyes/turtle_eyes_smile.webp","face":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/face/turtle_face_normal.webp"},"parts":{"lip":"lip_normal","eyes":"eyes_smile","face":"face_normal","species":"turtle"},"minted_at":1770946801304}'::jsonb,
  '2026-02-13 01:40:01.689486+00'
),

-- [05] 2026-02-13 02:10 | species:turtle / lip_smile / eyes_normal / face_vivid (webp)
(
  'dbabc94a-7715-4775-b9ef-e3bae9aaa9c0',
  'user_test_01',
  'd8cfd58416d6a576017256bc846eefe1eda853b357c33c17083feab39d0a9669',
  '{"meta":{"rarity":"Common","edition":null},"urls":{"lip":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/lip/turtle_lip_smile.webp","eyes":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/eyes/turtle_eyes_normal.webp","face":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/face/turtle_face_vivid.webp"},"parts":{"lip":"lip_smile","eyes":"eyes_normal","face":"face_vivid","species":"turtle"},"minted_at":1770948642846}'::jsonb,
  '2026-02-13 02:10:43.913207+00'
),

-- [06] 2026-02-13 02:15 | species:turtle / lip_normal / eyes_smile / face_normal (webp)
(
  'b398d700-f968-4315-87d3-92f02f0ccaa0',
  'user_test_01',
  'dacfcea3cf533c8b0f6e62901583790d737171ad955b17bd180092d538d77d5a',
  '{"meta":{"rarity":"Common","edition":null},"urls":{"lip":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/lip/turtle_lip_normal.webp","eyes":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/eyes/turtle_eyes_smile.webp","face":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/face/turtle_face_normal.webp"},"parts":{"lip":"lip_normal","eyes":"eyes_smile","face":"face_normal","species":"turtle"},"minted_at":1770948915939}'::jsonb,
  '2026-02-13 02:15:16.356+00'
),

-- [07] 2026-02-13 02:15 | species:turtle / lip_smile / eyes_normal / face_normal (webp)
(
  '06a63fb3-2938-476f-8785-2749f992c2d7',
  'user_test_01',
  'f974930ace220ef4565f39c864740aebeb4d0c4e7d42db118b6f435b625ef33a',
  '{"meta":{"rarity":"Common","edition":null},"urls":{"lip":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/lip/turtle_lip_smile.webp","eyes":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/eyes/turtle_eyes_normal.webp","face":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/face/turtle_face_normal.webp"},"parts":{"lip":"lip_smile","eyes":"eyes_normal","face":"face_normal","species":"turtle"},"minted_at":1770948940226}'::jsonb,
  '2026-02-13 02:15:40.332009+00'
),

-- [08] 2026-02-13 02:17 | species:turtle / lip_smile / eyes_normal / face_normal (webp)
(
  'a64e803f-7ad4-466a-8c94-1d61f5405b48',
  'user_test_01',
  '211b51fda52cc38089e843d2ccf97c34596cd58770dc9a8ec97cfc0e4b0ba53e',
  '{"meta":{"rarity":"Common","edition":null},"urls":{"lip":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/lip/turtle_lip_smile.webp","eyes":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/eyes/turtle_eyes_normal.webp","face":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/face/turtle_face_normal.webp"},"parts":{"lip":"lip_smile","eyes":"eyes_normal","face":"face_normal","species":"turtle"},"minted_at":1770949025793}'::jsonb,
  '2026-02-13 02:17:06.262991+00'
),

-- [09] 2026-02-13 02:19 | species:turtle / lip_normal / eyes_normal / face_normal (webp)
(
  '7dd245db-559d-40bb-8392-3a4a8bd0d3c3',
  'user_test_01',
  '1d0d8c9cbfe5a72b756a4cdc482a7ae337b0e9613fa52e2f40f3cb70b505dd51',
  '{"meta":{"rarity":"Common","edition":null},"urls":{"lip":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/lip/turtle_lip_normal.webp","eyes":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/eyes/turtle_eyes_normal.webp","face":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/face/turtle_face_normal.webp"},"parts":{"lip":"lip_normal","eyes":"eyes_normal","face":"face_normal","species":"turtle"},"minted_at":1770949183878}'::jsonb,
  '2026-02-13 02:19:44.023841+00'
),

-- [10] 2026-02-13 02:22 | species:turtle / lip_normal / eyes_smile / face_normal (webp)
(
  'be94b038-91fa-4ca0-979a-016237064b50',
  'user_test_01',
  'b7da2d723cebed2defa27651e3d5eebf74f429c208879808be1fc29cb6ab9d0e',
  '{"meta":{"rarity":"Common","edition":null},"urls":{"lip":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/lip/turtle_lip_normal.webp","eyes":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/eyes/turtle_eyes_smile.webp","face":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/face/turtle_face_normal.webp"},"parts":{"lip":"lip_normal","eyes":"eyes_smile","face":"face_normal","species":"turtle"},"minted_at":1770949357068}'::jsonb,
  '2026-02-13 02:22:37.461811+00'
),

-- [11] 2026-02-13 02:23 | species:turtle / lip_normal / eyes_normal / face_normal (webp)
(
  '754562a9-0bec-44ea-8c46-e014b80bbc42',
  'user_test_01',
  '9e2d70859f67a41eb0aa0bcc6603f0a9d125442a929bceb304c497207d0df8cd',
  '{"meta":{"rarity":"Common","edition":null},"urls":{"lip":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/lip/turtle_lip_normal.webp","eyes":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/eyes/turtle_eyes_normal.webp","face":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/face/turtle_face_normal.webp"},"parts":{"lip":"lip_normal","eyes":"eyes_normal","face":"face_normal","species":"turtle"},"minted_at":1770949402068}'::jsonb,
  '2026-02-13 02:23:22.193078+00'
),

-- [12] 2026-02-13 02:24 | species:turtle / lip_normal / eyes_normal / face_normal (webp)
(
  '1f9d3551-b1b1-4f80-8bdb-840b83f3b76d',
  'user_test_01',
  'aa4939f5e30963633c9927ccd4d65f0b26e537b441fff48e7708314fb398a5f6',
  '{"meta":{"rarity":"Common","edition":null},"urls":{"lip":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/lip/turtle_lip_normal.webp","eyes":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/eyes/turtle_eyes_normal.webp","face":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/face/turtle_face_normal.webp"},"parts":{"lip":"lip_normal","eyes":"eyes_normal","face":"face_normal","species":"turtle"},"minted_at":1770949452741}'::jsonb,
  '2026-02-13 02:24:12.869404+00'
),

-- [13] 2026-02-13 02:24 | species:turtle / lip_smile / eyes_normal / face_normal (webp)
(
  'a5549abd-44be-46a0-aed1-96133c0e689a',
  'user_test_01',
  '2ae9098d47f00ecc69675c8b4fba106095301766e090ef1a28a099a6d02ed042',
  '{"meta":{"rarity":"Common","edition":null},"urls":{"lip":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/lip/turtle_lip_smile.webp","eyes":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/eyes/turtle_eyes_normal.webp","face":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/face/turtle_face_normal.webp"},"parts":{"lip":"lip_smile","eyes":"eyes_normal","face":"face_normal","species":"turtle"},"minted_at":1770949464877}'::jsonb,
  '2026-02-13 02:24:25.246386+00'
),

-- [14] 2026-02-13 02:30 | species:turtle / lip_smile / eyes_normal / face_normal (webp)
(
  '380b8c09-5f23-4e5e-9743-9eb391a5791e',
  'user_test_01',
  'c336f90cb393f1c6f90f551d026acccabaae31d59824c6b6cf2b250d3b34616c',
  '{"meta":{"rarity":"Common","edition":null},"urls":{"lip":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/lip/turtle_lip_smile.webp","eyes":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/eyes/turtle_eyes_normal.webp","face":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/face/turtle_face_normal.webp"},"parts":{"lip":"lip_smile","eyes":"eyes_normal","face":"face_normal","species":"turtle"},"minted_at":1770949827886}'::jsonb,
  '2026-02-13 02:30:28.579477+00'
),

-- [15] 2026-02-13 02:37 | species:turtle / lip_normal / eyes_normal / face_normal (webp)
(
  '85a63e29-d817-4d1a-b83a-fec95cde1f90',
  'user_test_01',
  '770a3f65ddcb889fa0bc93c933b73a64f2781c4efa2b81aa246ba16385b33d13',
  '{"meta":{"rarity":"Common","edition":null},"urls":{"lip":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/lip/turtle_lip_normal.webp","eyes":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/eyes/turtle_eyes_normal.webp","face":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/face/turtle_face_normal.webp"},"parts":{"lip":"lip_normal","eyes":"eyes_normal","face":"face_normal","species":"turtle"},"minted_at":1770950256516}'::jsonb,
  '2026-02-13 02:37:37.441012+00'
),

-- [16] 2026-02-13 02:38 | species:turtle / lip_normal / eyes_normal / face_normal (webp)
(
  '2eb0936e-8877-4cf7-a9f2-d1ace451e687',
  'user_test_01',
  '01c5d7cba313dcacac3f05b535b770fa1d2d17f11cb0bc57c361f29140de9db1',
  '{"meta":{"rarity":"Common","edition":null},"urls":{"lip":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/lip/turtle_lip_normal.webp","eyes":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/eyes/turtle_eyes_normal.webp","face":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/face/turtle_face_normal.webp"},"parts":{"lip":"lip_normal","eyes":"eyes_normal","face":"face_normal","species":"turtle"},"minted_at":1770950328063}'::jsonb,
  '2026-02-13 02:38:48.200517+00'
),

-- [17] 2026-02-13 02:39 | species:turtle / lip_normal / eyes_normal / face_normal (webp)
(
  '3e2b52f6-f295-400e-9755-df402cf0e1d2',
  'user_test_01',
  '51c20e8af2607c19f5d431f566ebaef3e7bb0169dbc7a875a15a2e55263e33e6',
  '{"meta":{"rarity":"Common","edition":null},"urls":{"lip":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/lip/turtle_lip_normal.webp","eyes":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/eyes/turtle_eyes_normal.webp","face":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/face/turtle_face_normal.webp"},"parts":{"lip":"lip_normal","eyes":"eyes_normal","face":"face_normal","species":"turtle"},"minted_at":1770950348655}'::jsonb,
  '2026-02-13 02:39:08.762351+00'
),

-- [18] 2026-02-13 02:42 | species:turtle / lip_smile / eyes_normal / face_normal (webp)
(
  '0d9cd2ff-204a-4cf0-8637-29eb29c50a40',
  'user_test_01',
  '867b5e5632cc743a99c4037fd499edcf591ad96ca0f6bb48fc40f04783c48a85',
  '{"meta":{"rarity":"Common","edition":null},"urls":{"lip":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/lip/turtle_lip_smile.webp","eyes":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/eyes/turtle_eyes_normal.webp","face":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/face/turtle_face_normal.webp"},"parts":{"lip":"lip_smile","eyes":"eyes_normal","face":"face_normal","species":"turtle"},"minted_at":1770950576731}'::jsonb,
  '2026-02-13 02:42:57.131893+00'
),

-- [19] 2026-02-13 02:50 | species:turtle / lip_normal / eyes_normal / face_normal (webp)
(
  'c011bbed-f2a5-4ca5-bbe9-1d7ae9da28c8',
  'user_test_01',
  '19028663f5ceda3262aa344ae3f7f247926aa341daae802aee17a9984d7602d8',
  '{"meta":{"rarity":"Common","edition":null},"urls":{"lip":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/lip/turtle_lip_normal.webp","eyes":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/eyes/turtle_eyes_normal.webp","face":"https://ijymktztgxzyrnkaflpc.supabase.co/storage/v1/object/public/item-assets/animal/turtle/face/turtle_face_normal.webp"},"parts":{"lip":"lip_normal","eyes":"eyes_normal","face":"face_normal","species":"turtle"},"minted_at":1770951055340}'::jsonb,
  '2026-02-13 02:50:55.906726+00'
)

ON CONFLICT (id) DO NOTHING;


-- ============================================================
-- PART 3. 검증 쿼리 (마이그레이션 후 실행하여 확인)
-- ============================================================
-- SELECT COUNT(*) FROM public.items;        -- 기대값: 19
-- SELECT COUNT(*) FROM public.holdings;     -- 기대값:  1
-- SELECT COUNT(*) FROM public.price_logs;   -- 기대값:  1
-- SELECT * FROM public.holdings;
-- SELECT * FROM public.price_logs;
-- SELECT id, owner_id, attributes->'parts' as parts, created_at
-- FROM public.items ORDER BY created_at;


-- ============================================================
-- PART 4. (선택) RLS 활성화 예시
-- ============================================================
-- ALTER TABLE public.items       ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.holdings    ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE public.price_logs  ENABLE ROW LEVEL SECURITY;

-- public read 허용 정책 예시:
-- CREATE POLICY "allow_public_read" ON public.items FOR SELECT USING (true);


-- ============================================================
-- END OF MIGRATION
-- ============================================================
