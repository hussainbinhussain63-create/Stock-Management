// Optional: ONLY if the earlier 'staff01' ... 'staff05' accounts were provisioned.
// Requires explicit confirmation and the same private credentials as setup-users.
const {getAdmin}=require('../lib/admin');
(async()=>{
  if(process.env.CONFIRM_DISABLE_LEGACY_USERS!=='YES')throw Error('Set CONFIRM_DISABLE_LEGACY_USERS=YES to proceed.');
  const admin=getAdmin(),db=admin.firestore();
  for(const username of ['staff01','staff02','staff03','staff04','staff05']){
    const ref=db.collection('login_credentials').doc(username),cred=await ref.get();
    if(!cred.exists){console.log(username+': not present');continue}
    const uid=cred.data().uid;
    await ref.update({active:false});
    await db.collection('staff').doc(uid).set({active:false},{merge:true});
    try{await admin.auth().revokeRefreshTokens(uid)}catch(err){console.error(username+': token revoke failed:',err.message)}
    console.log(username+': disabled');
  }
})().catch(err=>{console.error(err.message);process.exitCode=1});
