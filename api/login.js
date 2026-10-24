const {scrypt, timingSafeEqual, createHash}=require('node:crypto');
const {promisify}=require('node:util');
const scryptAsync=promisify(scrypt);
const {getAdmin}=require('../lib/admin');
module.exports=async function handler(req,res) {
  res.setHeader('Cache-Control','no-store');
  if(req.method!=='POST') return res.status(405).json({error:'Method not allowed'});
  try {
    const {username,password}=req.body||{};
    if(typeof username!=='string'||typeof password!=='string'||
       !/^[a-z0-9_-]{3,24}$/.test(username)||password.length<8||password.length>256)
      return res.status(400).json({error:'Invalid username or password'});
    const admin=getAdmin();
    // Lightweight per-username/IP lockout. Stronger edge-level limits are advised for production.
    const ip=String(req.headers['x-vercel-forwarded-for']||req.headers['x-forwarded-for']||'unknown').split(',')[0].trim().slice(0,90);
    const attemptId=createHash('sha256').update(username+'|'+ip).digest('hex');
    const attemptRef=admin.firestore().collection('login_attempts').doc(attemptId);
    const current=await attemptRef.get();
    const now=Date.now(),old=current.exists?current.data():{};
    if(old.lockUntil&&old.lockUntil>now) return res.status(429).json({error:'Too many attempts. Try again later.'});
    const record=await admin.firestore().collection('login_credentials').doc(username).get();
    // Make unknown usernames take comparable hashing time.
    const data=record.exists?record.data():null;
    const salt=data&&data.salt?data.salt:'00000000000000000000000000000000';
    const expected=data&&data.passwordHash?Buffer.from(data.passwordHash,'hex'):Buffer.alloc(64);
    const actual=await scryptAsync(password,Buffer.from(salt,'hex'),64);
    const correct=expected.length===actual.length&&timingSafeEqual(expected,actual);
    if(!correct||!data||data.active!==true){
      const started=old.startedAt&&now-old.startedAt<15*60*1000?old.startedAt:now;
      const failures=started===old.startedAt?(Number(old.failures)||0)+1:1;
      await attemptRef.set({startedAt:started,failures,lockUntil:failures>=6?now+15*60*1000:0});
      return res.status(401).json({error:'Incorrect username or password'});
    }
    if(current.exists) await attemptRef.delete().catch(()=>{});
    const staff=await admin.firestore().collection('staff').doc(data.uid).get();
    if(!staff.exists||staff.data().active!==true) return res.status(403).json({error:'Account disabled'});
    const token=await admin.auth().createCustomToken(data.uid,{staffName:staff.data().name||data.username,staffUsername:data.username});
    return res.status(200).json({token});
  }catch(err){console.error('Login error',err);return res.status(500).json({error:'Login service unavailable'});}
};
