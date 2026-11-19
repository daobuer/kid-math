/**
 * 步进逻辑模块 - 步骤流转与动画编排
 * 管理加减法的4个步骤：展示算式 → 数位分割 → 个位归并/计算 → 得出结果
 * 使用差量渲染：列柱元素在步骤间保持复用，通过 CSS transition 实现平滑位移动画
 */

import { decomposeNumber } from './utils.js';
import {
  createColumnElement,
  createOperatorElement,
  createZoneLabel,
  createZoneDivider,
  createGroupValueLabel,
  getColumnPositions,
  getColumnY,
  getGroupWidth,
  LAYOUT,
} from './renderer.js';

/* 步骤名称定义 */
const STEP_LABELS = [
  '第一步：展示算式',
  '第二步：数位分割',
  '第三步：个位归并',
  '第四步：得出结果',
];

/* 减法步骤名称（第三步不同） */
const STEP_LABELS_SUB = [
  '第一步：展示算式',
  '第二步：数位分割',
  '第三步：个位计算',
  '第四步：得出结果',
];

/**
 * 步进控制器类
 * 管理题目的步骤流转和可视化渲染
 */
export class Stepper {
  /**
   * @param {Object} problem - 题目对象 { num1, num2, operator, result }
   * @param {HTMLElement} vizContainer - 可视化容器元素
   * @param {HTMLElement} problemDisplay - 算式展示元素
   * @param {HTMLElement} stepLabelEl - 步骤标签元素
   */
  constructor(problem, vizContainer, problemDisplay, stepLabelEl) {
    this.problem = problem;
    this.vizContainer = vizContainer;
    this.problemDisplay = problemDisplay;
    this.stepLabelEl = stepLabelEl;
    this.currentStep = 0;
    this.totalSteps = 4;
    this.isAddition = problem.operator === '+';

    /* 预计算题目数据 */
    this.num1Cols = decomposeNumber(problem.num1);
    this.num2Cols = decomposeNumber(problem.num2);
    this.num1Tens = this.num1Cols.filter(c => c.type === 'ten');
    this.num1Ones = this.num1Cols.filter(c => c.type === 'one');
    this.num2Tens = this.num2Cols.filter(c => c.type === 'ten');
    this.num2Ones = this.num2Cols.filter(c => c.type === 'one');

    /* 列柱元素池：id → DOM element，跨步骤复用实现平滑动画 */
    this.columnPool = new Map();
    /* 辅助元素（标签、分隔线、提示文字等），每步重建 */
    this.auxElements = [];

    /* 步骤变更回调 */
    this.onStepChange = null;

    /* 初始渲染 */
    this.renderStep(0);
  }

  /** 跳转到指定步骤 */
  goToStep(step) {
    if (step < 0 || step >= this.totalSteps) return;
    this.currentStep = step;
    this.renderStep(step);
    if (this.onStepChange) this.onStepChange(step);
  }

  /** 前进到下一步 */
  next() { this.goToStep(this.currentStep + 1); }

  /** 回退到上一步 */
  prev() { this.goToStep(this.currentStep - 1); }

  /** 获取当前步骤索引 */
  getCurrentStep() { return this.currentStep; }

  /** 是否为最后一步 */
  isLastStep() { return this.currentStep === this.totalSteps - 1; }

  /** 是否为第一步 */
  isFirstStep() { return this.currentStep === 0; }

  /* ========================================
     核心渲染流程
     ======================================== */

  /**
   * 渲染指定步骤
   * @param {number} step - 步骤索引 (0-3)
   */
  renderStep(step) {
    /* 更新步骤标签 */
    const labels = this.isAddition ? STEP_LABELS : STEP_LABELS_SUB;
    this.stepLabelEl.textContent = labels[step];

    /* 更新算式显示 */
    this.updateProblemDisplay(step);

    /* 清除辅助元素 */
    this.clearAuxElements();

    /* 计算当前步骤的目标列柱状态 */
    const targetColumns = this.computeTargetColumns(step);

    /* 差量更新列柱 DOM */
    this.diffUpdateColumns(targetColumns);

    /* 渲染辅助元素（区域标签、分隔线、提示等） */
    this.renderAuxElements(step);
  }

  /**
   * 更新算式显示
   * @param {number} step - 当前步骤
   */
  updateProblemDisplay(step) {
    const { num1, num2, operator, result } = this.problem;
    const resultClass = step === 3 ? 'result-shown' : 'result-hidden';
    const resultText = step === 3 ? result : '?';

    this.problemDisplay.innerHTML = `
      <span class="num">${num1}</span>
      <span class="op">${operator}</span>
      <span class="num">${num2}</span>
      <span class="eq">=</span>
      <span class="${resultClass}">${resultText}</span>
    `;
  }

  /* ========================================
     计算每个步骤的目标列柱状态
     返回数组: [{ id, value, type, x, y }, ...]
     ======================================== */

  /**
   * 根据步骤计算目标列柱数据
   * @param {number} step
   * @returns {Array<Object>} 目标列柱数组
   */
  computeTargetColumns(step) {
    switch (step) {
      case 0: return this.computeStep0Columns();
      case 1: return this.computeStep1Columns();
      case 2: return this.computeStep2Columns();
      case 3: return this.computeStep3Columns();
      default: return [];
    }
  }

  /**
   * 第一步：展示算式 - 两数字列柱并排展示
   */
  computeStep0Columns() {
    const baseY = LAYOUT.BASE_Y;
    const columns = [];

    /* 第一组（num1）居中于 GROUP1_CENTER */
    const g1Width = getGroupWidth(this.num1Cols.length);
    const g1StartX = LAYOUT.GROUP1_CENTER - g1Width / 2;
    const g1Positions = getColumnPositions(g1StartX, this.num1Cols.length);
    this.num1Cols.forEach((col, i) => {
      columns.push({
        id: `a-${col.type}-${i}`,
        value: col.value,
        type: col.type,
        x: g1Positions[i],
        y: getColumnY(col.type, col.value, baseY),
      });
    });

    /* 第二组（num2）居中于 GROUP2_CENTER */
    const g2Width = getGroupWidth(this.num2Cols.length);
    const g2StartX = LAYOUT.GROUP2_CENTER - g2Width / 2;
    const g2Positions = getColumnPositions(g2StartX, this.num2Cols.length);
    this.num2Cols.forEach((col, i) => {
      columns.push({
        id: `b-${col.type}-${i}`,
        value: col.value,
        type: col.type,
        x: g2Positions[i],
        y: getColumnY(col.type, col.value, baseY),
      });
    });

    return columns;
  }

  /**
   * 第二步：数位分割 - 十位列归左区，个位列归右区
   */
  computeStep1Columns() {
    const baseY = LAYOUT.BASE_Y;
    const columns = [];

    /* 十位区：num1的十位列 + num2的十位列 */
    const allTens = [
      ...this.num1Tens.map((c, i) => ({ id: `a-ten-${i}`, value: c.value, type: c.type })),
      ...this.num2Tens.map((c, i) => ({ id: `b-ten-${i}`, value: c.value, type: c.type })),
    ];
    const tensPositions = getColumnPositions(LAYOUT.TENS_ZONE_X, allTens.length);
    allTens.forEach((col, i) => {
      columns.push({ ...col, x: tensPositions[i], y: baseY });
    });

    /* 个位区：num1的个位列 + num2的个位列 */
    const allOnes = [
      ...this.num1Ones.map((c, i) => ({ id: `a-one-${i}`, value: c.value, type: c.type })),
      ...this.num2Ones.map((c, i) => ({ id: `b-one-${i}`, value: c.value, type: c.type })),
    ];
    const onesPositions = getColumnPositions(LAYOUT.ONES_ZONE_X, allOnes.length);
    allOnes.forEach((col, i) => {
      columns.push({
        ...col,
        x: onesPositions[i],
        y: getColumnY(col.type, col.value, baseY),
      });
    });

    return columns;
  }

  /**
   * 第三步：个位归并/计算
   */
  computeStep2Columns() {
    if (this.isAddition) {
      return this.computeStep2Addition();
    } else {
      return this.computeStep2Subtraction();
    }
  }

  /**
   * 加法第三步：个位合并
   * 十位区保持不变，个位区显示合并结果
   */
  computeStep2Addition() {
    const baseY = LAYOUT.BASE_Y;
    const columns = [];

    /* 十位区保持不变 */
    const allTens = [
      ...this.num1Tens.map((c, i) => ({ id: `a-ten-${i}`, value: c.value, type: c.type })),
      ...this.num2Tens.map((c, i) => ({ id: `b-ten-${i}`, value: c.value, type: c.type })),
    ];
    const tensPositions = getColumnPositions(LAYOUT.TENS_ZONE_X, allTens.length);
    allTens.forEach((col, i) => {
      columns.push({ ...col, x: tensPositions[i], y: baseY });
    });

    /* 计算个位合并 */
    const onesVal1 = this.num1Ones.length > 0 ? this.num1Ones[0].value : 0;
    const onesVal2 = this.num2Ones.length > 0 ? this.num2Ones[0].value : 0;
    const onesSum = onesVal1 + onesVal2;

    /* 个位区显示合并后的列柱 */
    const mergeCols = decomposeNumber(onesSum);
    const mergePositions = getColumnPositions(LAYOUT.ONES_ZONE_X, mergeCols.length);
    mergeCols.forEach((col, i) => {
      columns.push({
        id: `merge-${col.type}-${i}`,
        value: col.value,
        type: col.type,
        x: mergePositions[i],
        y: getColumnY(col.type, col.value, baseY),
      });
    });

    return columns;
  }

  /**
   * 减法第三步：个位计算（可能涉及借位）
   */
  computeStep2Subtraction() {
    const baseY = LAYOUT.BASE_Y;
    const columns = [];

    const aOnesVal = this.num1Ones.length > 0 ? this.num1Ones[0].value : 0;
    const bOnesVal = this.num2Ones.length > 0 ? this.num2Ones[0].value : 0;
    const aTensCount = this.num1Tens.length;
    const bTensCount = this.num2Tens.length;

    let remainingTens = aTensCount;
    let resultOnes;

    if (aOnesVal >= bOnesVal) {
      /* 直接相减 */
      resultOnes = aOnesVal - bOnesVal;
    } else {
      /* 需要借位 */
      remainingTens = aTensCount - 1;
      resultOnes = (aOnesVal + 10) - bOnesVal;
    }

    /* 减去 num2 的十位 */
    remainingTens -= bTensCount;

    /* 十位区：显示剩余的十位列 */
    const tensPositions = getColumnPositions(LAYOUT.TENS_ZONE_X, Math.max(remainingTens, 0));
    for (let i = 0; i < remainingTens; i++) {
      columns.push({
        id: `a-ten-${i}`,
        value: 10,
        type: 'ten',
        x: tensPositions[i],
        y: baseY,
      });
    }

    /* 个位区：显示计算结果 */
    if (resultOnes > 0) {
      columns.push({
        id: 'result-one',
        value: resultOnes,
        type: 'one',
        x: LAYOUT.ONES_ZONE_X,
        y: getColumnY('one', resultOnes, baseY),
      });
    }

    return columns;
  }

  /**
   * 第四步：得出结果 - 所有列柱合并居中展示
   */
  computeStep3Columns() {
    const baseY = LAYOUT.BASE_Y;
    const resultCols = decomposeNumber(this.problem.result);
    const totalWidth = getGroupWidth(resultCols.length);
    const startX = (LAYOUT.VIZ_WIDTH - totalWidth) / 2;
    const positions = getColumnPositions(startX, resultCols.length);

    return resultCols.map((col, i) => ({
      id: `result-${col.type}-${i}`,
      value: col.value,
      type: col.type,
      x: positions[i],
      y: getColumnY(col.type, col.value, baseY),
    }));
  }

  /* ========================================
     差量更新列柱 DOM
     复用已有元素实现 CSS transition 动画
     ======================================== */

  /**
   * 对比当前列柱池与目标状态，执行增/删/改
   * @param {Array<Object>} targetColumns - 目标列柱数据
   */
  diffUpdateColumns(targetColumns) {
    const targetMap = new Map(targetColumns.map(c => [c.id, c]));
    const currentIds = new Set(this.columnPool.keys());
    const targetIds = new Set(targetMap.keys());

    /* 1. 移除不再需要的列柱（淡出动画） */
    for (const id of currentIds) {
      if (!targetIds.has(id)) {
        const el = this.columnPool.get(id);
        el.style.opacity = '0';
        el.style.transform = 'scale(0.5)';
        el.style.pointerEvents = 'none';
        /* 动画结束后移除 DOM */
        const elRef = el;
        setTimeout(() => {
          if (elRef.parentNode) elRef.remove();
        }, 400);
        this.columnPool.delete(id);
      }
    }

    /* 2. 更新已有列柱的位置（CSS transition 自动动画） / 创建新列柱 */
    for (const [id, target] of targetMap) {
      if (this.columnPool.has(id)) {
        /* 更新已有元素位置 */
        const el = this.columnPool.get(id);
        el.style.left = `${target.x}px`;
        el.style.top = `${target.y}px`;
        el.style.opacity = '1';
        el.style.transform = 'scale(1)';
      } else {
        /* 创建新元素 */
        const el = createColumnElement({
          id: target.id,
          value: target.value,
          type: target.type,
          x: target.x,
          y: target.y,
          visible: false,
        });
        this.vizContainer.appendChild(el);
        this.columnPool.set(id, el);

        /* 延迟触发入场动画（需要两帧以确保初始状态被渲染） */
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            el.style.opacity = '1';
            el.style.transform = 'scale(1)';
          });
        });
      }
    }
  }

  /* ========================================
     辅助元素渲染（每步重建）
     ======================================== */

  /**
   * 渲染步骤相关的辅助元素
   * @param {number} step
   */
  renderAuxElements(step) {
    switch (step) {
      case 0:
        this.renderStep0Aux();
        break;
      case 1:
        this.renderStep1Aux();
        break;
      case 2:
        this.renderStep2Aux();
        break;
      case 3:
        this.renderStep3Aux();
        break;
    }
  }

  /** 第一步辅助元素：数字标签和运算符 */
  renderStep0Aux() {
    const baseY = LAYOUT.BASE_Y;

    /* num1 组标签 */
    const g1Width = getGroupWidth(this.num1Cols.length);
    const g1CenterX = LAYOUT.GROUP1_CENTER;
    const labelY = baseY + LAYOUT.TEN_COLUMN_HEIGHT + 36;
    this.addAux(createGroupValueLabel(this.problem.num1, g1CenterX - 15, labelY));

    /* 运算符 */
    const opY = baseY + LAYOUT.TEN_COLUMN_HEIGHT / 2 - 14;
    this.addAux(createOperatorElement(this.problem.operator, LAYOUT.OPERATOR_X, opY));

    /* num2 组标签 */
    const g2CenterX = LAYOUT.GROUP2_CENTER;
    this.addAux(createGroupValueLabel(this.problem.num2, g2CenterX - 15, labelY));
  }

  /** 第二步辅助元素：区域标签、分隔线 */
  renderStep1Aux() {
    /* 区域标签 */
    const tensLabel = createZoneLabel('十位', 'left');
    tensLabel.classList.add('visible');
    this.addAux(tensLabel);

    const onesLabel = createZoneLabel('个位', 'right');
    onesLabel.classList.add('visible');
    this.addAux(onesLabel);

    /* 分隔线 */
    const divider = createZoneDivider();
    divider.classList.add('visible');
    this.addAux(divider);

    /* 减法时在个位区添加减号 */
    if (!this.isAddition && this.num1Ones.length > 0 && this.num2Ones.length > 0) {
      const baseY = LAYOUT.BASE_Y;
      const minusX = LAYOUT.ONES_ZONE_X - 28;
      const minusY = baseY + LAYOUT.TEN_COLUMN_HEIGHT / 2 - 14;
      this.addAux(createOperatorElement('−', minusX, minusY));
    }
  }

  /** 第三步辅助元素：区域标签、分隔线、计算提示 */
  renderStep2Aux() {
    const baseY = LAYOUT.BASE_Y;

    /* 区域标签和分隔线 */
    const tensLabel = createZoneLabel('十位', 'left');
    tensLabel.classList.add('visible');
    this.addAux(tensLabel);

    const onesLabel = createZoneLabel('个位', 'right');
    onesLabel.classList.add('visible');
    this.addAux(onesLabel);

    const divider = createZoneDivider();
    divider.classList.add('visible');
    this.addAux(divider);

    if (this.isAddition) {
      /* 加法：显示个位合并提示 */
      const onesVal1 = this.num1Ones.length > 0 ? this.num1Ones[0].value : 0;
      const onesVal2 = this.num2Ones.length > 0 ? this.num2Ones[0].value : 0;
      const onesSum = onesVal1 + onesVal2;

      if (onesSum > 0) {
        const hintY = baseY + LAYOUT.TEN_COLUMN_HEIGHT + 36;
        const hint = this.createHint(
          `${onesVal1} + ${onesVal2} = ${onesSum}`,
          LAYOUT.ONES_ZONE_X,
          hintY,
          getGroupWidth(decomposeNumber(onesSum).length)
        );
        this.addAux(hint);
      }
    } else {
      /* 减法：显示借位标记和计算提示 */
      const aOnesVal = this.num1Ones.length > 0 ? this.num1Ones[0].value : 0;
      const bOnesVal = this.num2Ones.length > 0 ? this.num2Ones[0].value : 0;
      const needBorrow = aOnesVal < bOnesVal;

      if (needBorrow) {
        /* 借位标记 */
        const borrowEl = document.createElement('div');
        borrowEl.className = 'borrow-arrow visible anim-scale-in';
        borrowEl.style.position = 'absolute';
        const aTensCount = this.num1Tens.length;
        borrowEl.style.left = `${LAYOUT.TENS_ZONE_X + getGroupWidth(aTensCount) + 8}px`;
        borrowEl.style.top = `${baseY + 50}px`;
        borrowEl.innerHTML = '← 借1当10';
        borrowEl.style.fontSize = '13px';
        borrowEl.style.color = '#E53E3E';
        borrowEl.style.fontWeight = '600';
        borrowEl.style.whiteSpace = 'nowrap';
        this.addAux(borrowEl);
      }

      /* 计算提示 */
      const resultOnes = needBorrow ? (aOnesVal + 10) - bOnesVal : aOnesVal - bOnesVal;
      if (resultOnes >= 0) {
        const hintY = baseY + LAYOUT.TEN_COLUMN_HEIGHT + 36;
        const hintText = needBorrow
          ? `${aOnesVal}+10 − ${bOnesVal} = ${resultOnes}`
          : `${aOnesVal} − ${bOnesVal} = ${resultOnes}`;
        const hint = this.createHint(hintText, LAYOUT.ONES_ZONE_X, hintY, 80);
        this.addAux(hint);
      }
    }
  }

  /** 第四步辅助元素：结果等式 */
  renderStep3Aux() {
    const baseY = LAYOUT.BASE_Y;
    const eqY = baseY + LAYOUT.TEN_COLUMN_HEIGHT + 40;
    const { num1, num2, operator, result } = this.problem;

    const eqEl = document.createElement('div');
    eqEl.className = 'result-equation visible anim-fade-in-up';
    eqEl.style.position = 'absolute';
    eqEl.style.left = '0';
    eqEl.style.right = '0';
    eqEl.style.top = `${eqY}px`;
    eqEl.style.textAlign = 'center';
    eqEl.textContent = `${num1} ${operator} ${num2} = ${result}`;
    this.addAux(eqEl);
  }

  /* ========================================
     DOM 工具方法
     ======================================== */

  /** 添加辅助元素 */
  addAux(el) {
    this.vizContainer.appendChild(el);
    this.auxElements.push(el);
  }

  /** 清除所有辅助元素 */
  clearAuxElements() {
    for (const el of this.auxElements) {
      el.remove();
    }
    this.auxElements = [];
  }

  /** 创建提示文字元素 */
  createHint(text, x, y, width) {
    const el = document.createElement('div');
    el.className = 'hint-text visible anim-fade-in-up';
    el.style.position = 'absolute';
    el.style.left = `${x}px`;
    el.style.top = `${y}px`;
    el.style.width = `${width}px`;
    el.style.textAlign = 'center';
    el.textContent = text;
    return el;
  }

  /** 销毁步进器，清理所有 DOM */
  destroy() {
    for (const [, el] of this.columnPool) {
      el.remove();
    }
    this.columnPool.clear();
    this.clearAuxElements();
  }
}
