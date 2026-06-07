/**
 * One-shot diagnostic + cleanup script for the Firebase Auth ↔ Firestore
 * orphan problem.
 *
 *   node diagnose-auth.js                  → just diagnose
 *   node diagnose-auth.js --fix            → diagnose AND delete every orphan
 *   node diagnose-auth.js --email=foo@bar  → diagnose just that one email
 *   node diagnose-auth.js --email=foo@bar --fix
 *
 * What it does:
 *   1. Lists every user in Firebase Authentication.
 *   2. For each, checks whether the matching Firestore `users/{uid}` doc
 *      exists.
 *   3. Prints a table of (email, uid, has-doc?, emailVerified?).
 *   4. With --fix: deletes every Auth user that has no Firestore doc
 *      (those are the orphans that block re-registration with the same
 *      email).
 *
 * Run it from inside artisansmarket-admin/.
 *
 * Requirements (installed by `npm install firebase-admin`):
 *   - The service account JSON sitting in the project root:
 *     ../artisansmarket-5f2b6-firebase-adminsdk-fbsvc-db3140094b.json
 */

const path = require('path');
const admin = require('firebase-admin');

const SERVICE_ACCOUNT_PATH = path.join(
  __dirname,
  '..',
  'artisansmarket-5f2b6-firebase-adminsdk-fbsvc-db3140094b.json',
);

const args = process.argv.slice(2);
const fixMode = args.includes('--fix');
const emailArg = (args.find((a) => a.startsWith('--email=')) || '')
  .replace('--email=', '')
  .trim()
  .toLowerCase();

try {
  admin.initializeApp({
    credential: admin.credential.cert(require(SERVICE_ACCOUNT_PATH)),
  });
} catch (e) {
  console.error('❌ Could not load service account from', SERVICE_ACCOUNT_PATH);
  console.error('   ', e.message);
  process.exit(1);
}

const auth = admin.auth();
const db = admin.firestore();

(async () => {
  console.log('Scanning Firebase Authentication users …');
  const allUsers = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    allUsers.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  console.log(`  Found ${allUsers.length} Auth users total.`);

  const subject = emailArg
    ? allUsers.filter((u) => (u.email || '').toLowerCase() === emailArg)
    : allUsers;

  if (emailArg && subject.length === 0) {
    console.log(`\n✅ "${emailArg}" is NOT in Firebase Auth. You should be able to register it.`);
    process.exit(0);
  }

  const orphans = [];
  const rows = [];

  for (const u of subject) {
    const doc = await db.collection('users').doc(u.uid).get();
    const hasDoc = doc.exists;
    rows.push({
      email: u.email || '(no email)',
      uid: u.uid,
      authVerified: u.emailVerified,
      hasFirestoreDoc: hasDoc,
      orphan: !hasDoc,
    });
    if (!hasDoc) orphans.push(u);
  }

  console.log('\nResults:');
  console.table(rows);

  console.log(`\nSummary: ${orphans.length} orphan(s) (Auth user with no Firestore doc).`);

  if (orphans.length > 0 && !fixMode) {
    console.log('\nRe-run with --fix to delete the orphans:');
    console.log('  node diagnose-auth.js --fix');
    if (emailArg) {
      console.log(`  node diagnose-auth.js --email=${emailArg} --fix`);
    }
  }

  if (orphans.length > 0 && fixMode) {
    console.log('\nDeleting orphans …');
    for (const u of orphans) {
      try {
        await auth.deleteUser(u.uid);
        console.log(`  ✔ Deleted ${u.email || u.uid}`);
      } catch (e) {
        console.log(`  ✗ Failed to delete ${u.email || u.uid}: ${e.message}`);
      }
    }
    console.log('Done. Those emails are now available for fresh registration.');
  }

  process.exit(0);
})().catch((e) => {
  console.error('\n❌ Script failed:', e);
  process.exit(1);
});
