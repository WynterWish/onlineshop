const fetch = require('node-fetch');
const base = 'http://localhost:5000';

async function test(){
  console.log('此脚本假设 server 已运行并且有管理员 token（此处示例不自动登录）');
  console.log('示例调用：获取 top-products');
  const r = await fetch(base + '/api/analytics/top-products', { headers: { 'Authorization': 'Bearer ADMIN_TOKEN' }}).catch(e=>console.error(e));
  console.log('返回状态：', r && r.status);
}
test();
