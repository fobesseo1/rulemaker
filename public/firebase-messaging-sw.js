importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: 'AIzaSyCwBg0oQOW4Yru7BpKDnNGeqDvf_CU5zyw',
  authDomain: 'rulemaker-b91f7.firebaseapp.com',
  projectId: 'rulemaker-b91f7',
  messagingSenderId: '410959074120',
  appId: '1:410959074120:web:3d3efc72afa9ccd438997d',
});

const messaging = firebase.messaging();
