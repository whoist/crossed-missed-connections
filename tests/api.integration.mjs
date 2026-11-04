// Local Firebase emulators + local Next server ONLY. Never run against hosted data.
import assert from 'node:assert/strict';
import {initializeApp} from 'firebase-admin/app';
import {getAuth} from 'firebase-admin/auth';
import {getFirestore} from 'firebase-admin/firestore';
const base=process.env.CROSSED_TEST_URL||'http://127.0.0.1:3181';
if(!['127.0.0.1','localhost'].includes(new URL(base).hostname))throw new Error('Local test server required');
process.env.FIREBASE_AUTH_EMULATOR_HOST='127.0.0.1:9099';process.env.FIRESTORE_EMULATOR_HOST='127.0.0.1:8085';
const app=initializeApp({projectId:'demo-crossed'}),auth=getAuth(app),db=getFirestore(app);
const prefix='qa'+Date.now(),alice=prefix+'a',bob=prefix+'b',mallory=prefix+'m';
const jars=new Map(),ids=new Map();const password='fixture-password-only-8765';let checks=0;
async function firebase(action,data,expected=200){const r=await fetch('http://127.0.0.1:9099/identitytoolkit.googleapis.com/v1/accounts:'+action+'?key=fake',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});const j=await r.json();assert.equal(r.status,expected,JSON.stringify(j));checks++;return j;}
async function call(path,user,data,expected=200,origin=base){
 const headers={...(user?{Cookie:jars.get(user)||'','cf-connecting-ip':user}:{}),...(data?{'Content-Type':'application/json',Origin:origin}:{})};
 const r=await fetch(base+path,{method:data?'POST':'GET',headers,body:data?JSON.stringify(data):undefined});
 const j=await r.json();assert.equal(r.status,expected,`${path}: ${JSON.stringify(j)}`);checks++;
 if(user&&r.headers.get('set-cookie'))jars.set(user,r.headers.get('set-cookie').split(';')[0]);return j;
}
async function login(u,pass=password){const a=await firebase('signInWithPassword',{email:u+'@example.test',password:pass,returnSecureToken:true});return call('/api/auth',u,{action:'session',idToken:a.idToken});}
try{
 await call('/api/profile',null,{alias:'Anonymous',adult:true},401);
 for(const u of [alice,bob,mallory]){
  const a=await firebase('signUp',{email:u+'@example.test',password,returnSecureToken:true});ids.set(u,a.localId);
  await call('/api/auth',u,{action:'session',idToken:a.idToken},403);
  await firebase('sendOobCode',{requestType:'VERIFY_EMAIL',idToken:a.idToken});
  const codes=await(await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-crossed/oobCodes')).json();
  const code=codes.oobCodes.findLast(c=>c.email===u+'@example.test'&&c.requestType==='VERIFY_EMAIL');assert.ok(code);checks++;
  await firebase('update',{oobCode:code.oobCode});await login(u);
  await call('/api/profile',u,{alias:'Test member',adult:true});
 }
 await call('/api/auth',alice,{action:'session',idToken:'forged-token'},401);
 const forged=await fetch(base+'/api/profile',{headers:{'oai-authenticated-user-id':ids.get(alice),'oai-authenticated-user-email':'forged@example.test'}});assert.equal((await forged.json()).signedIn,false);checks++;
 assert.equal((await call('/api/profile')).signedIn,false);assert.equal((await call('/api/profile',alice)).signedIn,true);checks+=2;
 await firebase('signInWithPassword',{email:alice+'@example.test',password:'wrong-password-only-1234',returnSecureToken:true},400);
 await call('/api/profile',alice,{alias:'Bad origin',adult:true},403,'https://untrusted.example');
 const note={question:'What book was I holding?',title:'A fixture by the fountain',story:'A local integration test for the missed connection flow, not a real person.',place:'Washington Square Park',city:'New York, NY',category:'Out & about',lat:40.7308,lon:-73.9973,happened:'2026-10-01'};
 await call('/api/encounters',alice,{...note,happened:'2026-02-30'},400);
 const p=await call('/api/encounters',alice,note,201);const found=(await call('/api/encounters',bob)).encounters.find(x=>x.id===p.id);assert.ok(found);assert.equal(found.question,note.question);assert.equal(found.mine,false);assert.ok(!('owner'in found)&&!('email'in found));checks++;
 await call('/api/encounters/'+p.id,bob,{action:'delete'},403);await call('/api/encounters/'+p.id,bob,{action:'save'});
 assert.equal((await call('/api/encounters',bob)).encounters.find(x=>x.id===p.id).saved,true);checks++;
 await call('/api/encounters/'+p.id,null,{action:'reply',message:'A draft without signing in must never be sent.'},401);
 const thread=await call('/api/encounters/'+p.id,bob,{action:'reply',message:'I remember the fountain and the green book.'});
 assert.equal((await call('/api/inbox/'+thread.thread,alice)).messages[0].body,'I remember the fountain and the green book.');checks++;
 await call('/api/inbox/'+thread.thread,null,undefined,401);await call('/api/inbox/'+thread.thread,mallory,undefined,404);
 await call('/api/inbox/'+thread.thread,alice,{message:'That was us. Hello again!'});assert.equal((await call('/api/inbox/'+thread.thread,bob)).messages.length,2);checks++;
 const inbox=await call('/api/inbox',bob);assert.equal(inbox.threads[0].preview,'That was us. Hello again!');checks++;
 await call('/api/encounters/'+p.id,bob,{action:'report',reason:'Disposable test report for local QA only.'});assert.ok(!(await call('/api/encounters',bob)).encounters.some(x=>x.id===p.id));checks++;
 await call('/api/inbox/'+thread.thread,bob,{action:'block'});await call('/api/inbox/'+thread.thread,alice,undefined,404);assert.equal((await call('/api/inbox',bob)).threads.length,0);checks++;
 const old=jars.get(mallory);await call('/api/auth',mallory,{action:'logout'});assert.equal((await call('/api/profile',mallory)).signedIn,false);checks++;
 jars.set(mallory,old);assert.equal((await call('/api/profile',mallory)).signedIn,false);checks++;
 // Password reset links are issued by Firebase, not our application or recovery codes.
 await firebase('sendOobCode',{requestType:'PASSWORD_RESET',email:mallory+'@example.test'});
 const codes=await(await fetch('http://127.0.0.1:9099/emulator/v1/projects/demo-crossed/oobCodes')).json();const code=codes.oobCodes.findLast(c=>c.email===mallory+'@example.test'&&c.requestType==='PASSWORD_RESET');assert.ok(code);checks++;
 await firebase('resetPassword',{oobCode:code.oobCode,newPassword:'new-fixture-password-1234'});
 await firebase('resetPassword',{oobCode:code.oobCode,newPassword:'replayed-password-1234'},400);
 await firebase('signInWithPassword',{email:mallory+'@example.test',password,returnSecureToken:true},400);
 await login(mallory,'new-fixture-password-1234');
 for(const u of [alice,bob,mallory]){await call('/api/profile',u,{action:'delete-account',confirm:'DELETE'});assert.equal((await call('/api/profile',u)).signedIn,false);checks++;}
 assert.equal((await db.collection('encounters').where('owner','==',ids.get(alice)).get()).size,0);assert.equal((await db.collection('threads').where('members','array-contains',ids.get(bob)).get()).size,0);checks+=2;
 console.log(`PASS: ${checks} checks: verified email signup, secure sessions, reset-link single use, private messages, ownership, origin checks, blocks/reports and deletion.`);
}finally{
 for(const uid of ids.values()){
  for(const collection of ['encounters','reports','blocks','threads']){
   const rows=await db.collection(collection).get();for(const d of rows.docs){const v=d.data();if(v.owner===uid||v.user===uid||v.members?.includes(uid))await db.recursiveDelete(d.ref);}
  }
  await db.recursiveDelete(db.collection('profiles').doc(uid));await auth.deleteUser(uid).catch(()=>{});
 }
 console.log('Local fixtures removed.');
}
