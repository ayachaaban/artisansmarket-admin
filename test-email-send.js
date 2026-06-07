/**
 * Triggers Firebase Auth's email delivery pipeline directly — no mobile app
 * involved. If this prints "OK" but no email arrives, the issue is 100%
 * project-side (template, sender domain, quota, or spam).
 *
 *   node test-email-send.js you@example.com
 */
const { initializeApp } = require('firebase/app');
const { getAuth, sendPasswordResetEmail } = require('firebase/auth');

const target = process.argv[2];
if (!target) {
  console.error('Usage: node test-email-send.js <email>');
  process.exit(1);
}

const app = initializeApp({
  apiKey: 'AIzaSyDQSz_td7B6ih4N9Qql1krBv0OnSY_t5TU',
  authDomain: 'artisansmarket-5f2b6.firebaseapp.com',
  projectId: 'artisansmarket-5f2b6',
  appId: '1:89551898663:android:50c996fe5199184f1e2602',
});

(async () => {
  try {
    console.log(`Requesting password reset for ${target} ...`);
    await sendPasswordResetEmail(getAuth(app), target);
    console.log('✅ Firebase accepted the request. If no email arrives within 2 min:');
    console.log('   • check Gmail Spam / Promotions / All Mail');
    console.log('   • check Authentication → Templates not paused');
    console.log('   • check daily quota (~150/day free tier)');
    process.exit(0);
  } catch (e) {
    console.error('❌ Firebase REJECTED the request:');
    console.error('   code:', e.code);
    console.error('   message:', e.message);
    process.exit(1);
  }
})();
