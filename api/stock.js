// Stock writes and audit events are performed by the SAME Firestore transaction.
// Authenticated browsers can READ stock/activity but cannot bypass this API to edit them.
const {getAdmin}=require('../lib/admin');
const allowedSizes=new Set(['S','M','L','XL','2XL','3XL','4XL','5XL','6XL','7XL','Saree']);
function fail(code,message){const e=new Error(message);e.status=code;throw e}
function intQty(x){if(!Number.isInteger(x)||x<0||x>1000000)fail(400,'Invalid quantity');return x}
function clean(d){
 if(!d||typeof d!=='object'||Array.isArray(d))fail(400,'Invalid item');
 const size=String(d.size||'');if(!allowedSizes.has(size))fail(400,'Invalid size');
 const sku=String(d.sku||'').trim().toUpperCase();if(!/^[A-Z0-9_-]{2,45}$/.test(sku))fail(400,'Invalid SKU');
 const price=String(d.price??'').trim();if(price.length>25||!/^[\d.]*$/.test(price))fail(400,'Invalid price');
 const img=String(d.img||'');if(img && (!/^data:image\/(jpeg|png|webp);base64,/i.test(img)||img.length>700000))fail(400,'Image is too large or invalid; use a smaller image');
 const qty=intQty(Number(d.qty));
 const ts=Number(d.ts);return {size,sku,price,img,qty,sold:qty===0,ts:Number.isFinite(ts)&&ts>0?ts:Date.now()};
}
const summary=item=>item?{sku:item.sku,size:item.size,price:item.price,qty:item.qty,sold:item.sold}:null;
module.exports=async function handler(req,res){
 res.setHeader('Cache-Control','no-store');
 if(req.method!=='POST')return res.status(405).json({error:'Method not allowed'});
 try{
  const rawToken=String(req.headers.authorization||'').match(/^Bearer (.+)$/i)?.[1];
  if(!rawToken)fail(401,'Login required');
  const admin=getAdmin();
  const verified=await admin.auth().verifyIdToken(rawToken,true);
  const {id,before,after,deleted}=req.body||{};
  if(typeof id!=='string'||!/^[A-Za-z0-9_-]{4,70}$/.test(id))fail(400,'Invalid item ID');
  if(Boolean(deleted)&&after!=null)fail(400,'Invalid deletion');
  const desired=deleted?null:clean(after);
  const oldVersion=before==null?null:Number(before.version||0);
  if(oldVersion!==null&&(!Number.isInteger(oldVersion)||oldVersion<0))fail(400,'Invalid record version');
  const db=admin.firestore();
  const stockRef=db.collection('stock').doc(id);
  const staffRef=db.collection('staff').doc(verified.uid);
  const auditRef=db.collection('stock_activity').doc();
  const activity=await db.runTransaction(async tx=>{
   // All reads BEFORE all writes. Server checks staff authorization itself.
   const staffSnap=await tx.get(staffRef);
   const currentSnap=await tx.get(stockRef);
   if(!staffSnap.exists||staffSnap.data().active!==true)fail(403,'Staff account inactive');
   const member=staffSnap.data(),userName=String(member.name||member.username||'Staff');
   const server=currentSnap.exists?currentSnap.data():null;
   if(Boolean(server)!==(oldVersion!==null))fail(409,'Stock changed on another device. Please retry');
   let next=null;
   if(deleted){
     if(!server)fail(409,'Item already removed');
     if(Number(server.version||0)!==oldVersion)fail(409,'Item updated on another device. Please retry');
   }else if(!server){
     next={...desired,version:1};
   }else{
     const sameVersion=Number(server.version||0)===oldVersion;
     if(!sameVersion){
       // A stale sale/restock can be merged via its quantity DELTA, never price/picture edits.
       const base=clean(before);
       const edits=['size','sku','price','img','ts'].some(k=>desired[k]!==base[k]);
       if(edits)fail(409,'Other user edited this item. Please retry');
       const delta=desired.qty-base.qty;
       const qty=intQty(Number(server.qty||0)+delta);
       next={...server,qty,sold:qty===0,version:Number(server.version||0)+1};
     }else{
       next={...desired,version:Number(server.version||0)+1};
     }
   }
   let action=deleted?'deleted':!server?'added':'updated';
   if(server&&!deleted){
     if(next.qty<server.qty)action='sold';
     else if(next.qty>server.qty)action=server.qty===0?'restored':'stock_added';
     else if(next.price!==server.price)action='price_updated';
     else if(next.img!==server.img)action='photo_updated';
   }
   const stamp=admin.firestore.FieldValue.serverTimestamp();
   if(deleted){tx.delete(stockRef)}
   else{tx.set(stockRef,{...next,updatedBy:userName,updatedByUid:verified.uid,updatedAt:stamp})}
   const event={itemId:id,action,actorName:userName,actorUsername:String(member.username||''),actorUid:verified.uid,
     before:summary(server),after:summary(next),at:stamp};
   tx.create(auditRef,event);
   return {action};
  });
  return res.status(200).json({ok:true,action:activity.action});
 }catch(err){
  const status=err.status||((err.code==='auth/id-token-expired'||String(err.code||'').startsWith('auth/'))?401:500);
  if(status>=500)console.error('Stock API error',err);
  return res.status(status).json({error:status>=500?'Stock save failed':err.message});
 }
};
