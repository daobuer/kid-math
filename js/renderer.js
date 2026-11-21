/**
 * 渲染模块 - 块式列柱 DOM 创建与管理
 * 每列由10个等高长方体块堆叠组成，下5块红色、上5块黑色、空位蓝色虚线
 */

/* 块体尺寸常量 */
const BLOCK_WIDTH = 100;
const BLOCK_HEIGHT = 25;
const BLOCK_GAP = 10;
const BLOCK_RADIUS = 3;

/* 每列块数 */
const BLOCKS_PER_COLUMN = 10;

/* 列柱间距 */
const COLUMN_GAP = 10;

/* 每列总高度 = 10 * 25 + 9 * 10 = 340px */
const COLUMN_TOTAL_HEIGHT = BLOCKS_PER_COLUMN * BLOCK_HEIGHT + (BLOCKS_PER_COLUMN - 1) * BLOCK_GAP;

/* 可视化区域布局常量 */
const VIZ_WIDTH = 820;
const BASE_Y = 20;

/**
 * 创建一个块式列柱 DOM 元素
 * 列柱由10个块体组成，通过 flex-direction: column-reverse 实现底部对齐
 *
 * @param {Object} options
 * @param {string} options.id - 列柱唯一标识
 * @param {number} options.filled - 填充的块数 (0-10)
 * @param {number} options.x - 水平位置
 * @param {number} options.y - 垂直位置
 * @param {boolean} options.visible - 是否立即可见
 * @returns {HTMLElement} 列柱 DOM 元素
 */
export function createBlockColumn({ id, filled, x, y, visible = true }) {
  const col = document.createElement('div');
  col.className = 'column';
  col.dataset.id = id;
  col.style.left = `${x}px`;
  col.style.top = `${y}px`;

  if (!visible) {
    col.style.opacity = '0';
    col.style.transform = 'scale(0.8)';
    col.style.pointerEvents = 'none';
  }

  /* 创建10个块体，i=1在底部，i=10在顶部 */
  for (let i = 1; i <= BLOCKS_PER_COLUMN; i++) {
    const block = document.createElement('div');
    block.className = 'block';

    if (i <= filled) {
      /* 已填充：下5块红色，上5块黑色 */
      if (i <= 5) {
        block.classList.add('block-red');
      } else {
        block.classList.add('block-black');
      }
    } else {
      /* 空位：蓝色虚线边框 */
      block.classList.add('block-empty');
    }

    col.appendChild(block);
  }

  return col;
}

/**
 * 更新列柱的填充块数（用于动画过渡）
 * @param {HTMLElement} colEl - 列柱 DOM 元素
 * @param {number} filled - 新的填充块数
 */
export function updateColumnFilled(colEl, filled) {
  const blocks = colEl.querySelectorAll('.block');
  blocks.forEach((block, index) => {
    const position = index + 1; /* 1-10 */
    block.className = 'block';
    if (position <= filled) {
      if (position <= 5) {
        block.classList.add('block-red');
      } else {
        block.classList.add('block-black');
      }
    } else {
      block.classList.add('block-empty');
    }
  });
}

/**
 * 创建运算符 DOM 元素
 * @param {string} operator - '+' 或 '-'
 * @param {number} x
 * @param {number} y
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
 * 创建区域标签
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
 * @param {number} x
 * @param {number} y
 * @returns {HTMLElement}
 */
export function createGroupValueLabel(value, x, y) {
  const el = document.createElement('div');
  el.className = 'group-value-label';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.textContent = value;
  return el;
}

/**
 * 创建列间运算符元素（放在两个列之间的间隙中）
 * @param {string} operator - '+' 或 '−'
 * @param {number} leftColX - 左侧列的 x 坐标
 * @param {number} y - 垂直位置
 * @returns {HTMLElement}
 */
export function createBetweenOperator(operator, leftColX, y) {
  const el = document.createElement('div');
  el.className = 'viz-operator between-operator';
  el.textContent = operator;
  /* 列宽100 + 间距10，运算符中心放在间隙中间 */
  el.style.left = `${leftColX + 95}px`;
  el.style.top = `${y}px`;
  return el;
}

/**
 * 创建提示文字元素
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {number} width
 * @returns {HTMLElement}
 */
export function createHintElement(text, x, y, width) {
  const el = document.createElement('div');
  el.className = 'hint-text visible';
  el.style.left = `${x}px`;
  el.style.top = `${y}px`;
  el.style.width = `${width}px`;
  el.textContent = text;
  return el;
}

/**
 * 计算一组列柱的总宽度
 * @param {number} count - 列柱数量
 * @returns {number}
 */
export function getGroupWidth(count) {
  if (count <= 0) return 0;
  return count * BLOCK_WIDTH + (count - 1) * COLUMN_GAP;
}

/**
 * 计算一组列柱中每列的 x 坐标
 * @param {number} startX - 起始 x 坐标
 * @param {number} count - 列柱数量
 * @returns {Array<number>}
 */
export function getColumnPositions(startX, count) {
  const positions = [];
  for (let i = 0; i < count; i++) {
    positions.push(startX + i * (BLOCK_WIDTH + COLUMN_GAP));
  }
  return positions;
}

/* 导出布局常量 */
export const LAYOUT = {
  BLOCK_WIDTH,
  BLOCK_HEIGHT,
  BLOCK_GAP,
  BLOCKS_PER_COLUMN,
  COLUMN_TOTAL_HEIGHT,
  COLUMN_GAP,
  VIZ_WIDTH,
  BASE_Y,
  TENS_ZONE_X: 40,
  ONES_ZONE_X: 440,
  GROUP1_CENTER: 200,
  GROUP2_CENTER: 600,
  OPERATOR_X: 400,
};
