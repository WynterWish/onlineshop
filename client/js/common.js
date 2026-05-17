function logout() {
  try {
    localStorage.clear();
    sessionStorage.clear();
  } catch (e) {}
  // Redirect to initial login page
  location.href = '/';
}

// Optional: support logout via element id click delegation
document.addEventListener('click', function (e) {
  if (e.target && e.target.id === 'logoutLink') {
    e.preventDefault(); logout();
  }
});

// 在登录后在导航中插入“我的邮箱”链接（放在 我的订单 与 注销 之间）
document.addEventListener('DOMContentLoaded', function () {
  try {
    const token = localStorage.getItem('token');
    // 管理员不要显示“我的邮箱”
    const isAdmin = (localStorage.getItem('isAdmin') === 'true' || localStorage.getItem('isAdmin') === '1');
    if (!token || isAdmin) return;
    const top = document.getElementById('topnav');
    if (!top) return;
    if (document.getElementById('inboxLink')) return;
    const a = document.createElement('a');
    a.id = 'inboxLink';
    a.href = '/inbox.html';
    a.style.marginLeft = '12px';
    a.innerText = '我的邮箱';
    const orders = document.getElementById('ordersLink');
    const logout = document.getElementById('logoutLink');
    if (orders && orders.parentNode === top) {
      if (orders.nextSibling) top.insertBefore(a, orders.nextSibling);
      else top.appendChild(a);
    } else if (logout && logout.parentNode === top) {
      top.insertBefore(a, logout);
    } else {
      top.appendChild(a);
    }
  } catch (e) {}
});

// 浏览行为采集：记录停留时长与商品类别（如果页面提供）
(function(){
  let start = Date.now();
  function getCategory(){
    // 优先使用 meta 标签，其次 body 的 data-category，再 fallback 为 unknown
    const m = document.querySelector('meta[name="product-category"]');
    if (m && m.content) return m.content;
    if (document.body && document.body.dataset && document.body.dataset.category) return document.body.dataset.category;
    return null;
  }
  function sendBrowse(durationSec){
    const payload = { type: 'browse', category: getCategory(), duration: Math.round(durationSec) };
    const token = localStorage.getItem('token');
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = 'Bearer ' + token;
    // 使用 sendBeacon 在卸载时更可靠
    const url = '/api/collect';
    const body = JSON.stringify(payload);
    if (navigator.sendBeacon) {
      const blob = new Blob([body], { type: 'application/json' });
      navigator.sendBeacon(url, blob);
    } else {
      fetch(url, { method: 'POST', headers, body }).catch(()=>{});
    }
  }
  // 当页面不可见或卸载时发送停留时长（秒）
  function handleVisibility(){
    if (document.visibilityState === 'hidden') {
      const dur = (Date.now() - start) / 1000;
      sendBrowse(dur);
    }
  }
  window.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('beforeunload', function(){
    const dur = (Date.now() - start) / 1000;
    sendBrowse(dur);
  });
})();

