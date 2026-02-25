import webpush from 'web-push';

webpush.setVapidDetails(
  process.env.VAPID_EMAIL!,
  process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!,
  process.env.VAPID_PRIVATE_KEY!,
);

const subscription = {
  endpoint:
    'https://fcm.googleapis.com/fcm/send/f0Gk3XaVc_w:APA91bH4wXqpv4WLdUGiEeBg1oHasZcdL9vq9f6VN902D1ZyEexDH7v8lfjfCKE4wCEl7qw_ihcK_Xj6m1lZcjZIxxFe3sAkAl7fLfE2AcaktHuW62yWLtnukkiY0SKqIrNbnp9puJHW',
  expirationTime: null,
  keys: {
    p256dh:
      'BKItk2eszWqh63uoO1HWKGt_iY1BojUboWHh3UQWf_ku-ijWVuyUkf3TYFi5LtYq4PbX-3I4BkNWlETBsi2Qjx8',
    auth: '7ZHIfWyvsoWUcHKNjbmaog',
  },
};

async function testPush() {
  try {
    await webpush.sendNotification(
      subscription,
      JSON.stringify({
        title: '⚠️ 삼성전자: 원칙이 작동했습니다',
        body: '방어선(210,000원)이 붕괴되었습니다.',
      }),
    );
    console.log('✅ 알림 발송 성공!');
  } catch (error) {
    console.error('❌ 발송 실패:', error);
  }
}

testPush();
