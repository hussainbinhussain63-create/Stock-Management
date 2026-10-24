Mysmar Stock Manager — 7 staff users + verified activity history
==============================================================
USERS (all have the same stock permissions; two Fatimas are distinct):
fatima1 = Fatima (1)
irfan   = Irfan
ayesha  = Ayesha
fatima2 = Fatima (2)
ali     = Ali
tooba   = Tooba
maham   = Maham

FILES
 index.html                 Existing interface + username login + Activity History button
 api/login.js               Server-side custom-token login and basic failed-login lockout
 api/stock.js               SECURE stock writes + audit in one Firestore transaction
 lib/admin.js               Firebase Admin SDK initialization (server-side only)
 scripts/setup-users.js     Provisions the 7 accounts, unique random passwords
 scripts/disable-legacy-users.js  Optional disabling of old staff01...staff05 accounts
 firestore.rules            Staff can READ stock/history; only backend can WRITE
 package.json               Firebase Admin dependency
 .gitignore                 No secrets checked into GitHub

SETUP (do not post passwords or service account JSON in a chat)
1. Firebase Console > Project settings > Service accounts > Generate new private key.
   Save JSON securely ON YOUR COMPUTER. This is NOT the public Firebase web config.
2. Vercel > your project > Settings > Environment Variables: add
   FIREBASE_SERVICE_ACCOUNT_JSON = entire JSON text of your Firebase service account.
   Apply to Production. Keep it secret (do not use VITE_, PUBLIC_, NEXT_PUBLIC_).
3. In the GitHub Stock-Management repository upload/replace ALL contents of this
   package preserving directories, not only index.html. Commit; ensure Vercel
   builds the OTHER preset with a Vercel Node.js function at /api/login and /api/stock.
   Redeploy after saving the environment variable.
4. Firebase > Firestore Database > Rules: paste COMPLETE contents of
   firestore.rules and press Publish. IMPORTANT: these rules block direct writes
   and old client versions, so do this with the new Vercel API deployed.
5. To provision user accounts: on your computer install Node.js, extract this ZIP,
   open PowerShell in the extracted folder and run:
      npm install
      $env:FIREBASE_SERVICE_ACCOUNT_JSON=Get-Content 'C:\private\key.json' -Raw
      npm run setup-users
   Replace the sample path with your OWN private Firebase service account JSON path.
   On macOS/Linux:
      export FIREBASE_SERVICE_ACCOUNT_JSON="$(cat /safe/location/key.json)"
      npm install && npm run setup-users
   This prints randomly generated passwords ONLY ONCE. Share each privately.
   If OLD 'staff01'...'staff05' accounts were previously provisioned and are no
   longer intended, optionally disable them after creating the named users:
      $env:CONFIRM_DISABLE_LEGACY_USERS='YES'
      npm run disable-legacy
   On Mac/Linux: CONFIRM_DISABLE_LEGACY_USERS=YES npm run disable-legacy
   Delete the local environment variable afterwards; never publish passwords.
6. Sign in at your live Vercel address with each account (e.g. fatima1).
   Use 2 devices and test add, sell, restore, delete, picture upload.
   Open Activity History. Check that actor, SKU, quantity and time appear correctly.
7. Confirm each operation appears as a matching stock document and audit event
   under Firebase Console > Firestore > stock and stock_activity.

SECURITY: The activity log is written by the trusted server after checking
Firebase ID token + staff active status; users cannot write to/delete logs
from the browser because Firestore Security Rules deny direct writes.
Change history starts only after the NEW version is deployed, and does not
backfill old changes. Staff who share credentials will not be distinguishable.
The backend provides basic 6-fail/15-minute lockout per username/IP combination;
add stronger WAF/edge rate limits for public use. A determined distributed
attacker may evade the basic lockout.

IMPORTANT LIMITATIONS:
- This build is not yet tested against your live Firebase/Vercel accounts.
- Inline base64 product photos must fit Firestore's 1 MiB document limit;
  large product images may be rejected. Cloud Storage would be needed to scale.
- If an operation includes multiple products, mutations are sent sequentially:
  successful ones are logged but later ones could fail. They are not one batch.
- Existing stock may remain, but old records may have version=0; the server
  supports these without wiping your inventory.
- Activity History shows the 100 newest events; older events stay in Firestore.
- This is a technical deploy package: account creation, secure environment
  configuration and deployment need to be completed before the features work.
