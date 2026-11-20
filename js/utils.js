/**
 * 工具模块 - 题目生成与数字拆分
 * 负责生成30以内的加减法题目，以及将数字分解为3列块式列柱数据
 */

/**
 * 生成一道30以内的加减法题目
 * 规则：结果不为负数，两个操作数都在1-29之间
 * @returns {Object} 题目对象 { num1, num2, operator, result }
 */
export function generateProblem() {
  const isAddition = Math.random() < 0.5;

  if (isAddition) {
    /* 加法：两数之和不超过30 */
    const num1 = randomInt(1, 29);
    const maxNum2 = 30 - num1;
    const num2 = randomInt(1, Math.min(maxNum2, 29));
    return { num1, num2, operator: '+', result: num1 + num2 };
  } else {
    /* 减法：被减数 >= 减数，结果不为负 */
    const num1 = randomInt(2, 30);
    const num2 = randomInt(1, num1);
    return { num1, num2, operator: '-', result: num1 - num2 };
  }
}

/**
 * 将数字分解为固定3列的块式列柱数据
 * 每列有10个块位，filled表示填充的块数(0-10)
 * 下5块(position 1-5)填充为红色，上5块(position 6-10)填充为黑色
 * 未填充的位置为蓝色虚线边框
 *
 * 例如数字14：
 *   列0: filled=10 (下5红+上5黑)
 *   列1: filled=4  (下4红+6虚线)
 *   列2: filled=0  (全虚线)
 *
 * @param {number} num - 要分解的数字 (0-30)
 * @returns {Array<Object>} 固定3列的列柱数据 [{ filled: number }, ...]
 */
export function decomposeNumber(num) {
  const columns = [];
  for (let i = 0; i < 3; i++) {
    const filled = Math.min(Math.max(num - i * 10, 0), 10);
    columns.push({ filled });
  }
  return columns;
}

/**
 * 获取数字的十位部分（满10的列数）
 * @param {number} num
 * @returns {number} 十位满列的数量
 */
export function getTensCount(num) {
  return Math.floor(num / 10);
}

/**
 * 获取数字的个位值
 * @param {number} num
 * @returns {number} 个位数值
 */
export function getOnesValue(num) {
  return num % 10;
}

/**
 * 判断减法是否需要借位
 * @param {number} num1 - 被减数
 * @param {number} num2 - 减数
 * @returns {boolean} 是否需要借位
 */
export function needsBorrow(num1, num2) {
  return getOnesValue(num1) < getOnesValue(num2);
}

/**
 * 生成指定范围内的随机整数（包含两端）
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 随机整数
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
