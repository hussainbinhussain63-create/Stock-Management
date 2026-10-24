const admin = require('firebase-admin');
function getAdmin() {
  if (!admin.apps.length) {
    const raw=process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
    if (!raw) throw new Error('Server authentication is not configured');
    const credentials=JSON.parse(raw);
    admin.initializeApp({ credential: admin.credential.cert(credentials) });
  }
  return admin;
}
module.exports={getAdmin};
