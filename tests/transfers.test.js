import test from 'node:test';
import assert from 'node:assert/strict';
import { connection } from '../config/database.js';
import { executeVirement } from '../controllers/clientcontrollers/virementcontroller.js';

for (const scenario of ['internal', 'beneficiary', 'blocked-source', 'blocked-destination', 'insufficient', 'same-account', 'foreign-beneficiary']) {
 test(`transfer: ${scenario}`, async t => {
  const writes=[];
  let committed=false, rolledBack=false, released=false;
  const db={
   async beginTransaction(){},
   async query(sql,params){
    if(sql.includes('FOR UPDATE')) {
     assert.match(sql,/clientId = \?/);
     assert.match(sql,/IN \('actif', 'active'\)/);
     assert.equal(params[1],7);
     if((params[0]===1&&scenario==='blocked-source')||(params[0]===2&&scenario==='blocked-destination'))return [[]];
     return [[{id:params[0],numeroCompte:'TEST',typedecompte:'COURANT',solde:scenario==='insufficient'?'1.00':'100.00'}]];
    }
    if(sql.includes('FROM beneficiaries')) {
     assert.deepEqual(params,[3,7]);
     return [scenario==='foreign-beneficiary'?[]:[{id:3,name:'Test beneficiary'}]];
    }
    writes.push({sql,params});return [{affectedRows:1}];
   },
   async commit(){committed=true;},async rollback(){rolledBack=true;},release(){released=true;}
  };
  t.mock.method(connection,'getConnection',async()=>db);
  let redirect;
  await executeVirement({session:{userId:7},body:{compteSourceId:'1',compteDestId:scenario==='same-account'?'1':'2',beneficiaireId:'3',typeDestinataire:['beneficiary','foreign-beneficiary'].includes(scenario)?'beneficiaire':'interne',montant:'10.50'}},{redirect(url){redirect=url;}});
  assert.equal(released,true);
  if(['internal','beneficiary'].includes(scenario)) {
   assert.equal(committed,true);assert.equal(rolledBack,false);
   assert.match(redirect,/success=effectue/);
   assert.equal(writes.filter(x=>x.sql.includes('INSERT INTO virement')).length,1);
   assert.equal(writes.filter(x=>x.sql.includes('INSERT INTO transactions')).length,scenario==='internal'?2:1);
   assert.deepEqual(writes.find(x=>x.sql.includes('solde = solde -')).params,[10.5,1]);
   if(scenario==='internal')assert.deepEqual(writes.find(x=>x.sql.includes('solde = solde +')).params,[10.5,2]);
  } else {
   assert.equal(committed,false);assert.equal(rolledBack,true);assert.equal(writes.length,0);assert.match(redirect,/error=/);
  }
 });
}
