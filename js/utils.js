/**
 * 工具模块 - 题目生成与数字拆分
 * 负责生成30以内的加减法题目，以及将数字分解为列柱数据
 */

/**
 * 生成一道30以内的加减法题目
 * 规则：结果不为负数，两个操作数都在1-29之间
 * @returns {Object} 题目对象 { num1, num2, operator, result }
 */
export function generateProblem() {
  /* 随机决定是加法还是减法 */
  const isAddition = Math.random() < 0.5;

  if (isAddition) {
    /* 加法：两数之和不超过30 */
    const num1 = randomInt(1, 29);
    const maxNum2 = 30 - num1;
    const num2 = randomInt(1, Math.min(maxNum2, 29));
    return {
      num1,
      num2,
      operator: '+',
      result: num1 + num2
    };
  } else {
    /* 减法：被减数 >= 减数，结果不为负 */
    const num1 = randomInt(2, 30);
    const num2 = randomInt(1, num1);
    return {
      num1,
      num2,
      operator: '-',
      result: num1 - num2
    };
  }
}

/**
 * 将数字分解为列柱数据数组
 * 每个满10的列生成一个 { value: 10, type: 'ten' }
 * 剩余不足10的部分生成一个 { value: remainder, type: 'one' }
 * @param {number} num - 要分解的数字 (0-30)
 * @returns {Array<Object>} 列柱数据数组
 */
export function decomposeNumber(num) {
  const columns = [];
  let remaining = num;

  /* 提取满10的列 */
  while (remaining >= 10) {
    columns.push({ value: 10, type: 'ten' });
    remaining -= 10;
  }

  /* 剩余不足10的部分 */
  if (remaining > 0) {
    columns.push({ value: remaining, type: 'one' });
  }

  return columns;
}

/**
 * 获取数字的十位部分（满10的列数）
 * @param {number} num
 * @returns {number} 十位列的数量
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
 * 生成指定范围内的随机整数（包含两端）
 * @param {number} min - 最小值
 * @param {number} max - 最大值
 * @returns {number} 随机整数
 */
function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
