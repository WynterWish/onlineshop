(function(){
  try{
    const top = document.getElementById('topnav');
    if (!top) return;
    const isAdmin = (localStorage.getItem('isAdmin') === 'true' || localStorage.getItem('isAdmin') === '1');
    const token = localStorage.getItem('token');
    const baseLinks = `
      <a href="/">登录</a>
      <a href="/index.html" style="margin-left:12px">商品列表</a>
      <a href="/cart.html" style="margin-left:12px">购物车</a>`;
    const omitSales = (top.dataset.noSalesMenu === 'true') || (document.body && document.body.dataset.noSalesMenu === 'true');
    if (isAdmin) {
      // only keep sales report link for admins
      top.innerHTML = baseLinks + `
        <a id="adminSalesReportLink" href="/admin/sales-report.html" style="margin-left:12px">销售统计报表</a>
        <a id="logoutLink" href="#" style="margin-left:12px">注销</a>`;
    } else {
      top.innerHTML = baseLinks + (token ? `<a id="logoutLink" href="#" style="margin-left:12px">注销</a>` : '');
    }
    const logout = document.getElementById('logoutLink');
    if (logout) logout.addEventListener('click', (e)=>{ e.preventDefault(); try{ localStorage.clear(); sessionStorage.clear(); }catch(err){}; location.href = '/'; });
    // 简单高亮当前页
    try{
      const path = location.pathname || '';
      document.querySelectorAll('#topnav a').forEach(a=>{
        try{
          const href = a.getAttribute('href') || '';
          if (!href || href === '#') return;
          if (path.endsWith(href) || path === href || (href !== '/' && path.indexOf(href.replace(/^\//,'')) !== -1)) {
            a.style.fontWeight = '700';
            a.style.textDecoration = 'underline';
          }
        }catch(e){}
      });
    }catch(e){}
  }catch(e){}
})();
