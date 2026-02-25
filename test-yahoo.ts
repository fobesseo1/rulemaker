import YahooFinance from 'yahoo-finance2';

const yahooFinance = new YahooFinance();

async function testStockPrice() {
  try {
    const result = await yahooFinance.quote('005930.KS');

    console.log('=== 삼성전자 ===');
    console.log('현재가:', result.regularMarketPrice);
    console.log('전일종가:', result.regularMarketPreviousClose);
    console.log('종목명:', result.longName);
    console.log('통화:', result.currency);
  } catch (error) {
    console.error('에러:', error);
  }
}

testStockPrice();
