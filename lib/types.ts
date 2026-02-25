export interface Holding {
  id: string;
  push_subscription: PushSubscriptionJSON;
  symbol: string;
  name: string;
  buy_price: number;
  highest_price: number;
  defense_line: number;
  trailing_pct: number;
  quantity: number | null;
  buy_reason_category: string | null;
  buy_reason_memo: string | null;
  created_at: string;
}

export type BuyReasonCategory = '실적호조' | '테마모멘텀' | '수출증가' | '기타';

export interface PriceData {
  price: number;
  currency: string;
  name: string;
  isMarketOpen: boolean;
}

export interface PushSubscriptionJSON {
  endpoint: string;
  expirationTime: number | null;
  keys: {
    p256dh: string;
    auth: string;
  };
}
