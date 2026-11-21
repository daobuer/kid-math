/**
 * 下拉刷新模块
 * 支持 PC 鼠标下拉 和 iPad 触摸手势下拉
 * 下拉距离超过阈值后松手执行 location.reload()
 */

/* 触发刷新的下拉距离阈值（px） */
const THRESHOLD = 80;
/* 最大下拉距离（px），超过后不再跟随 */
const MAX_PULL = 150;
/* 阻尼系数：下拉越远阻力越大 */
const DAMPING = 0.5;

let startY = 0;
let pullDistance = 0;
let isPulling = false;
let indicator = null;
let appEl = null;
let arrowEl = null;
let textEl = null;

/**
 * 初始化下拉刷新
 * 绑定鼠标和触摸事件监听器
 */
export function initPullRefresh() {
  indicator = document.getElementById('pullRefreshIndicator');
  appEl = document.querySelector('.main-card');
  arrowEl = indicator.querySelector('.pull-refresh-arrow');
  textEl = indicator.querySelector('.pull-refresh-text');

  /* PC 鼠标事件 */
  document.addEventListener('mousedown', onMouseDown);
  document.addEventListener('mousemove', onMouseMove);
  document.addEventListener('mouseup', onMouseUp);

  /* iPad / 触摸屏事件 */
  document.addEventListener('touchstart', onTouchStart, { passive: false });
  document.addEventListener('touchmove', onTouchMove, { passive: false });
  document.addEventListener('touchend', onTouchEnd);
}

/* ---------- 鼠标事件 ---------- */

function onMouseDown(e) {
  /* 只在页面顶部且未滚动时才允许下拉刷新 */
  if (window.scrollY > 0) return;
  /* 忽略右键和中键 */
  if (e.button !== 0) return;
  startY = e.clientY;
  isPulling = true;
  pullDistance = 0;
}

function onMouseMove(e) {
  if (!isPulling) return;
  const diff = e.clientY - startY;
  if (diff > 0) {
    e.preventDefault();
    updatePull(diff);
  }
}

function onMouseUp() {
  if (!isPulling) return;
  endPull();
}

/* ---------- 触摸事件 ---------- */

function onTouchStart(e) {
  if (window.scrollY > 0) return;
  /* 只处理单指触摸 */
  if (e.touches.length !== 1) return;
  startY = e.touches[0].clientY;
  isPulling = true;
  pullDistance = 0;
}

function onTouchMove(e) {
  if (!isPulling) return;
  const diff = e.touches[0].clientY - startY;
  if (diff > 0) {
    /* 阻止页面滚动和橡皮筋效果 */
    e.preventDefault();
    updatePull(diff);
  }
}

function onTouchEnd() {
  if (!isPulling) return;
  endPull();
}

/* ---------- 核心逻辑 ---------- */

/**
 * 更新下拉状态
 * @param {number} rawDiff - 原始下拉距离
 */
function updatePull(rawDiff) {
  /* 应用阻尼效果，下拉越远越难拉 */
  pullDistance = Math.min(rawDiff * DAMPING, MAX_PULL);

  /* 更新指示器位置：从顶部 -60px 逐渐下移 */
  const indicatorY = -60 + pullDistance;
  indicator.style.top = `${indicatorY}px`;
  indicator.style.transition = 'none';

  /* 页面内容跟随下移 */
  appEl.style.transform = `translateY(${pullDistance}px)`;
  appEl.style.transition = 'none';

  /* 根据下拉距离更新文字和箭头 */
  if (pullDistance >= THRESHOLD * DAMPING) {
    textEl.textContent = '松开刷新';
    arrowEl.style.transform = 'rotate(180deg)';
  } else {
    textEl.textContent = '下拉刷新';
    arrowEl.style.transform = 'rotate(0deg)';
  }

  indicator.classList.add('active');
}

/**
 * 结束下拉，判断是否触发刷新
 */
function endPull() {
  isPulling = false;

  if (pullDistance >= THRESHOLD * DAMPING) {
    /* 超过阈值，执行刷新 */
    textEl.textContent = '刷新中...';
    /* 添加回弹动画后刷新 */
    appEl.style.transition = 'transform 0.2s ease';
    appEl.style.transform = 'translateY(0)';
    indicator.style.transition = 'top 0.2s ease';
    indicator.style.top = '-60px';

    /* 短暂延迟让动画可见，然后刷新 */
    setTimeout(() => {
      location.reload();
    }, 200);
  } else {
    /* 未超过阈值，回弹复位 */
    resetPull();
  }
}

/**
 * 复位下拉状态
 */
function resetPull() {
  pullDistance = 0;

  /* 添加回弹过渡动画 */
  appEl.style.transition = 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1)';
  appEl.style.transform = 'translateY(0)';

  indicator.style.transition = 'top 0.3s ease';
  indicator.style.top = '-60px';

  /* 动画结束后清理 */
  setTimeout(() => {
    indicator.classList.remove('active');
    appEl.style.transition = '';
    appEl.style.transform = '';
    indicator.style.transition = '';
    arrowEl.style.transform = '';
    textEl.textContent = '下拉刷新';
  }, 300);
}
