import test from 'node:test';
import assert from 'node:assert/strict';
import bcrypt from 'bcrypt';
import { connection } from '../config/database.js';
import { login } from '../controllers/authcontroller.js';
import { authMiddleware, isAuthenticated, isClient } from '../middleware/authmiddleware.js';
import { isAdmin } from '../middleware/isAdmin.js';

function response() {
 return { code: 200, status(n){this.code=n;return this;}, json(data){this.data=data;}, send(data){this.data=data;}, render(view,data){this.view=view;this.data=data;}, redirect(url){this.url=url;}, clearCookie(){} };
}
function session(user = { id: 7, roleId: 2 }) {
 return { user, destroy(callback){this.destroyed=true;callback();} };
}

test('login rejects stopped users and displays the account message', async t => {
 t.mock.method(connection,'query',async()=>[[{id:7,roleId:1,statut:'inactif',emailVerifie:1,motDePass:'hash'}]]);
 t.mock.method(bcrypt,'compare',async()=>true);
 const req={body:{email:'test@example.com',motdepass:'password'},session:session()};
 const res=response();
 await login(req,res);
 assert.equal(res.code,403);
 assert.equal(res.view,'auth/login');
 assert.equal(res.data.error,'Your account is stopped.');
 assert.equal(req.session.destroyed,true);
});

test('active clients and admins log in to their own dashboard', async t => {
 t.mock.method(bcrypt,'compare',async()=>true);
 for(const roleId of [1,2]) {
  const mock=t.mock.method(connection,'query',async()=>[[{id:7,roleId,statut:'actif',emailVerifie:1,motDePass:'hash'}]]);
  const req={body:{email:'test@example.com',motdepass:'password'},session:session()};
  const res=response();
  await login(req,res);
  assert.equal(res.url,roleId===1?'/dashboard':'/admin/dashboard');
  mock.mock.restore();
 }
});

test('database role overrides a stale administrator session', async t => {
 t.mock.method(connection,'query',async()=>[[{id:7,roleId:1,statut:'actif'}]]);
 const req={path:'/api/test',session:session()};
 const res=response();
 await authMiddleware(req,res,()=>isAdmin(req,res,()=>assert.fail('Admin access granted')));
 assert.equal(res.code,403);
 assert.equal(req.session.user.roleId,1);
});

test('deactivation invalidates existing sessions for pages and APIs', async t => {
 t.mock.method(connection,'query',async()=>[[{id:7,roleId:2,statut:'inactif'}]]);
 for(const api of [false,true]) {
  const req={path:'/api/test',session:session()};
  const res=response();
  await (api?authMiddleware:isAuthenticated)(req,res,()=>assert.fail('Access granted'));
  assert.equal(req.session.destroyed,true);
  assert.equal(req.session.user,undefined);
  if(api)assert.equal(res.code,403);
  else assert.equal(res.url,'/auth/login?error=account-stopped');
 }
});

test('client middleware rejects unknown roles and redirects admins',()=>{
 for(const roleId of [2,3]) {
  const res=response();
  isClient({user:{roleId}},res,()=>assert.fail('Client access granted'));
  if(roleId===2)assert.equal(res.url,'/admin/dashboard');
  else assert.equal(res.code,403);
 }
});

test('database failure does not grant access', async t => {
 const failure=new Error('Database unavailable');
 t.mock.method(connection,'query',async()=>{throw failure;});
 let error;
 await isAuthenticated({session:session()},response(),err=>{error=err;});
 assert.equal(error,failure);
});
