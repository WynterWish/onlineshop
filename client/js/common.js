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

