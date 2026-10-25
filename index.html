// Deletes stock items of ONE size in batches and writes a matching audit event in the same atomic batch.
// The browser calls this repeatedly until it returns removed: 0.
const {getAdmin}=require('../lib/admin');
const allowedSizes=new Set(['S','M','L','XL','2XL','3XL','4XL','5XL','6XL','7XL','Saree']);
const BATCH=400; // 400 deletes + 1 audit write stays under Firestore's 500 operations limit
function fail(code,message){const e=new Error(message);e.status=code;throw e}
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 try{
  const rawToken=String(req.headers.authorization||'').match(/^Bearer (.+)$/i)?.[1];
  if(!rawToken)fail(401,'Login required');
  const admin=getAdmin();
  const verified=await admin.auth().verifyIdToken(rawToken,true);
  const size=String((req.body||{}).size||'');
  if(!allowedSizes.has(size))fail(400,'Invalid size');
  const db=admin.firestore();
  const staffSnap=await db.collection('staff').doc(verified.uid).get();
  if(!staffSnap.exists||staffSnap.data().active!==true)fail(403,'Staff account inactive');
  const member=staffSnap.data(),userName=String(member.name||member.username||'Staff');
  // select() with no fields returns only document references, so large image data is not loaded into memory.
  const snap=await db.collection('stock').where('size','==',size).select().limit(BATCH).get();
  if(snap.empty)return res.status(200).json({ok:true,removed:0});
  const stamp=admin.firestore.FieldValue.serverTimestamp();
  const batch=db.batch();
  snap.docs.forEach(d=>batch.delete(d.ref));
  batch.create(db.collection('stock_activity').doc(),{
   itemId:'size:'+size,action:'cleared_size',actorName:userName,actorUsername:String(member.username||''),actorUid:verified.uid,
   before:{sku:snap.size+' items',size,qty:snap.size},after:{sku:snap.size+' items',size,qty:0},at:stamp});
  await batch.commit();
  return res.status(200).json({ok:true,removed:snap.size});
 }catch(err){
  const status=err.status||((String(err.code||'').startsWith('auth/'))?401:500);
  if(status>=500)console.error('Clear size error',err);
  return res.status(status).json({error:status>=500?'Clear size failed':err.message});
 }
};
