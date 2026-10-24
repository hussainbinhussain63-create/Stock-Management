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

UPDATE — Back navigation, Clear All per size, longer photo-label SKUs
===================================================================
1. Browser/phone Back inside any size screen now returns to Sizes without
   revisiting the previous login site or refreshing the app. The in-app
   "← Sizes" button uses the same navigation behavior.
2. Each size screen (S, M, L, XL, 2XL, ... Saree) has a red Clear All button.
   It deletes ONLY that size's stock entries (available AND sold out), after
   typing the size and a second confirmation. EVERY removed item is logged as
   "Size cleared" with the verified staff identity in Activity History.
   THIS ACTION IS PERMANENT. Download a stock backup before clearing.
3. Picture text reading recognizes longer SKUs such as HRT101695 and HRT10169S
   (OCR 'S' vs '5'), recognizes AED price separately, and displays a larger
   cropped label preview to verify before adding. Always check each SKU manually
   before you press Add, especially faint/blurry photos; OCR is not infallible.

DEPLOYMENT OF THIS UPDATE
- Replace the complete project with the files in this ZIP and deploy on Vercel.
- NEW: api/clear-size.js must deploy together with index.html (not just HTML).
- Your Vercel Firebase service-account environment variable and existing
  Firebase/Firestore staff accounts are reused. DO NOT rerun setup-users: it
  may rotate users' passwords or create different credentials.
- This package DOES NOT include any private account credentials or secret JSON.
- Stock currently held in Firebase is NOT wiped by deploying this new ZIP.
- Clear All requires an internet connection and the new API to be live.
- Size clears are processed in bounded, auditable batches; if connectivity
  fails during a large clear, some earlier batches may already be deleted.
  Refresh and retry, checking the remaining entries. Audit history is retained.
- Live integration with your Vercel and Firebase project could not be run here;
  first test on one empty or noncritical size with your own deployment.
