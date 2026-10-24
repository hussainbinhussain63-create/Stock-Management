// Run on your own computer with a private Firebase service account.
// Idempotent: existing usernames are NOT overwritten, preventing credential reset.
const {randomBytes,scryptSync}=require('node:crypto');
const {getAdmin}=require('../lib/admin');
const USERS=[
  {username:'fatima1',name:'Fatima (1)'},
  {username:'irfan',name:'Irfan'},
  {username:'ayesha',name:'Ayesha'},
  {username:'fatima2',name:'Fatima (2)'},
  {username:'ali',name:'Ali'},
  {username:'tooba',name:'Tooba'},
  {username:'maham',name:'Maham'}
];
(async()=>{
 const admin=getAdmin(),db=admin.firestore();
 for(const {username,name} of USERS){
   const credentialRef=db.collection('login_credentials').doc(username);
   if((await credentialRef.get()).exists){console.log(username+': already exists; unchanged');continue;}
   const uid='mysmar_'+username;
   try{await admin.auth().getUser(uid)}
   catch(err){if(err.code!=='auth/user-not-found')throw err;await admin.auth().createUser({uid,disabled:false,displayName:name});}
   const password=randomBytes(18).toString('base64url');
   const salt=randomBytes(16).toString('hex');
   const passwordHash=scryptSync(password,Buffer.from(salt,'hex'),64).toString('hex');
   await db.collection('staff').doc(uid).set({username,name,active:true,role:'staff'});
   await credentialRef.set({uid,username,active:true,salt,passwordHash});
   console.log(`${name.padEnd(11)} | ${username.padEnd(9)} | ${password}`);
 }
 console.log('Copy generated credentials to a safe offline location. They cannot be displayed again.');
})().catch(err=>{console.error(err.message);process.exitCode=1});
