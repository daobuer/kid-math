/**
 * 渲染模块 - 列柱 DOM 创建与管理
 * 负责创建列柱元素、运算符元素等可视化组件
 */

/* 十位列柱的固定高度（像素） */
const TEN_COLUMN_HEIGHT = 130;

/* 个位列柱按数值比例计算高度的基数 */
const COLUMN_HEIGHT_RATIO = 130 / 10;

/* 列柱宽度 */
const COLUMN_WIDTH = 48;

/* 列柱之间的间距 */
const COLUMN_GAP = 10;

/**
 * 创建一个列柱 DOM 元素
 * @param {Object} options - 列柱配置
 * @param {string} options.id - 唯一标识
 * @param {number} options.value - 列柱代表的数值
 * @param {string} options.type - 列柱类型 'ten' | 'one'
 * @param {number} options.x - 水平位置
 * @param {number} options.y - 垂直位置
 * @param {boolean} options.visible - 是否可见
 * @param {string} options.extraClass - 额外CSS类名
 * @returns {HTMLElement} 列柱DOM元素
 */
export function createColumnElement({ id, value, type, x, y, visible = true, extraClass = '' }) {
  const col = document.createElement('div');
  col.className = `column column-${type} ${extraClass}`.trim();
  col.dataset.id = id;
  col.style.left = `${x}px`;
  col.style.top = `${y}px`;

  if (!visible) {
    col.style.opacity = '0';
    col.style.transform = 'scale(0.5)';
    col.style.pointerEvents = 'none';
  }

  /* 顶部数值标签 */
  const label = document.createElement('div');
  label.className = 'column-label';
  label.textContent = value;

  /* 柱体 */
  const bar = document.createElement('div');
  bar.className = 'column-bar';

  if (type === 'one') {
    /* 个位列柱高度按数值比例计算 */
    const height = Math.max(value * COLUMN_HEIGHT_RATIO, 20);
    bar.style.height = `${height}px`;
  }

  col.appendChild(label);
  col.appendChild(bar);
  return col;
}

/**
 * 创建运算符 DOM 元素（+ 或 -）
 * @param {string} operator - 运算符 '+' 或 '-'
 * @param {number} x - 水平位置
 * @param {number} y - 垂直位置
 * @returns {HTMLElement}
 */
export function createOperatorElement(operator, x, y) {
  const el = document.createElement('div');
  el.className = 'viz-operator';
  el.textContent = operator;
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  return el;
}

/**
 * 创建区域标签（十位/个位）
 * @param {string} text - 标签文字
 * @param {string} position - 'left' 或 'right'
 * @returns {HTMLElement}
 */
export function createZoneLabel(text, position) {
  const el = document.createElement('div');
  el.className = `zone-label zone-label-${position === 'left' ? 'tens' : 'ones'}`;
  el.textContent = text;
  return el;
}

/**
 * 创建区域分隔线
 * @returns {HTMLElement}
 */
export function createZoneDivider() {
  const el = document.createElement('div');
  el.className = 'zone-divider';
  return el;
}

/**
 * 创建组底部数字标签
 * @param {number} value - 数字值
 * @param {number} x - 水平位置
 * @param {number} y - 垂直位置
 * @returns {HTMLElement}
 */
export function createGroupValueLabel(value, x, y) {
  const el = document.createElement('div');
  el.style.position = 'absolute';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.fontFamily = "'Georgia', serif";
  el.style.fontSize = '18px';
  el.style.fontWeight = '700';
  el.style.color = '#2D3748';
  el.style.textAlign = 'center';
  el.style.transition = 'opacity 0.35s ease';
  el.textContent = value;
  return el;
}

/**
 * 计算一组列柱的总宽度
 * @param {number} count - 列柱数量
 * @returns {number} 总宽度（像素）
 */
export function getGroupWidth(count) {
  if (count <= 0) return 0;
  return count * COLUMN_WIDTH + (count - 1) * COLUMN_GAP;
}

/**
 * 计算一组列柱中每个列柱的x坐标
 * @param {number} startX - 起始x坐标
 * @param {number} count - 列柱数量
 * @returns {Array<number>} 每个列柱的x坐标数组
 */
export function getColumnPositions(startX, count) {
  const positions = [];
  for (let i = 0; i < count; i++) {
    positions.push(startX + i * (COLUMN_WIDTH + COLUMN_GAP));
  }
  return positions;
}

/**
 * 计算列柱的y坐标（底部对齐）
 * 十位列柱和个位列柱底部对齐，个位列柱较短所以top值更大
 * @param {string} type - 'ten' 或 'one'
 * @param {number} value - 列柱数值（个位列柱需要）
 * @param {number} baseY - 基准y坐标（十位列柱的top）
 * @returns {number} y坐标
 */
export function getColumnY(type, value, baseY) {
  if (type === 'ten') {
    return baseY;
  }
  /* 个位列柱底部对齐：top = baseY + (十位高度 - 个位高度) */
  const oneHeight = Math.max(value * COLUMN_HEIGHT_RATIO, 20);
  return baseY + (TEN_COLUMN_HEIGHT - oneHeight);
}

/* 导出常量供其他模块使用 */
export const LAYOUT = {
  TEN_COLUMN_HEIGHT,
  COLUMN_HEIGHT_RATIO,
  COLUMN_WIDTH,
  COLUMN_GAP,
  VIZ_WIDTH: 680,
  BASE_Y: 40,
  TENS_ZONE_X: 80,
  ONES_ZONE_X: 400,
  GROUP1_CENTER: 190,
  GROUP2_CENTER: 470,
  OPERATOR_X: 330,
};
