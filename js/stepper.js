/**
 * 步进逻辑模块 - 步骤流转与动画编排
 *
 * 步骤流程：
 *   加法 / 减法(无需借位): 展示算式 → 数位分割 → 个位归并/计算 → 得出结果 (4步)
 *   减法(需要借位):       展示算式 → 数位分割 → 借位迁移 → 个位计算 → 得出结果 (5步)
 *
 * 借位规则：从十位迁移一个满10的列到个位区，不合并，
 *   直接计算 10 - 减数个位 + 原被减数个位
 *
 * 渲染方式：差量更新，列柱元素跨步骤复用，CSS transition 实现平滑动画
 */

import { decomposeNumber, getTensCount, getOnesValue, needsBorrow } from './utils.js';
import {
  createBlockColumn,
  updateColumnFilled,
  createOperatorElement,
  createZoneLabel,
  createZoneDivider,
  createGroupValueLabel,
  createHintElement,
  getColumnPositions,
  getGroupWidth,
  LAYOUT,
} from './renderer.js';

/**
 * 步进控制器类
 */
export class Stepper {
  /**
   * @param {Object} problem - { num1, num2, operator, result }
   * @param {HTMLElement} vizContainer - 可视化容器
   * @param {HTMLElement} problemDisplay - 算式展示元素
   * @param {HTMLElement} stepLabelEl - 步骤标签元素
   */
  constructor(problem, vizContainer, problemDisplay, stepLabelEl) {
    this.problem = problem;
    this.vizContainer = vizContainer;
    this.problemDisplay = problemDisplay;
    this.stepLabelEl = stepLabelEl;
    this.currentStep = 0;

    this.isAddition = problem.operator === '+';
    this.isBorrow = !this.isAddition && needsBorrow(problem.num1, problem.num2);
    this.totalSteps = this.isBorrow ? 5 : 4;

    /* 步骤标签 */
    if (this.isBorrow) {
      this.stepLabels = ['第一步：展示算式', '第二步：数位分割', '第三步：借位迁移', '第四步：个位计算', '第五步：得出结果'];
    } else if (this.isAddition) {
      this.stepLabels = ['第一步：展示算式', '第二步：数位分割', '第三步：个位归并', '第四步：得出结果'];
    } else {
      this.stepLabels = ['第一步：展示算式', '第二步：数位分割', '第三步：个位计算', '第四步：得出结果'];
    }

    /* 预计算列柱数据 */
    this.num1Cols = decomposeNumber(problem.num1);
    this.num2Cols = decomposeNumber(problem.num2);

    /* 分离十位满列和个位列 */
    this.num1Tens = this.num1Cols.map((c, i) => ({ ...c, colIdx: i })).filter(c => c.filled === 10);
    this.num1Ones = this.num1Cols.map((c, i) => ({ ...c, colIdx: i })).filter(c => c.filled > 0 && c.filled < 10);
    this.num2Tens = this.num2Cols.map((c, i) => ({ ...c, colIdx: i })).filter(c => c.filled === 10);
    this.num2Ones = this.num2Cols.map((c, i) => ({ ...c, colIdx: i })).filter(c => c.filled > 0 && c.filled < 10);

    /* 数值 */
    this.aOnesVal = getOnesValue(problem.num1);
    this.bOnesVal = getOnesValue(problem.num2);
    this.aTensCount = getTensCount(problem.num1);
    this.bTensCount = getTensCount(problem.num2);

    /* 列柱池 */
    this.columnPool = new Map();
    this.auxElements = [];
    this.onStepChange = null;

    this.renderStep(0);
  }

  goToStep(step) {
    if (step < 0 || step >= this.totalSteps) return;
    this.currentStep = step;
    this.renderStep(step);
    if (this.onStepChange) this.onStepChange(step);
  }

  next() { this.goToStep(this.currentStep + 1); }
  prev() { this.goToStep(this.currentStep - 1); }
  getCurrentStep() { return this.currentStep; }
  isLastStep() { return this.currentStep === this.totalSteps - 1; }
  isFirstStep() { return this.currentStep === 0; }

  /* ========================================
     核心渲染
     ======================================== */

  renderStep(step) {
    this.stepLabelEl.textContent = this.stepLabels[step];
    this.updateProblemDisplay(step);
    this.clearAuxElements();

    const targetColumns = this.computeTargetColumns(step);
    this.diffUpdateColumns(targetColumns);
    this.renderAuxElements(step);
  }

  updateProblemDisplay(step) {
    const { num1, num2, operator, result } = this.problem;
    const isLast = step === this.totalSteps - 1;
    const resultClass = isLast ? 'result-shown' : 'result-hidden';
    const resultText = isLast ? result : '?';

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
     返回 [{ id, filled, x, y }, ...]
     ======================================== */

  computeTargetColumns(step) {
    if (this.isBorrow) {
      switch (step) {
        case 0: return this.computeStep0();
        case 1: return this.computeStep1();
        case 2: return this.computeStep2Borrow();
        case 3: return this.computeStep3BorrowCompute();
        case 4: return this.computeResultStep();
      }
    } else {
      switch (step) {
        case 0: return this.computeStep0();
        case 1: return this.computeStep1();
        case 2: return this.isAddition ? this.computeStep2Addition() : this.computeStep2SubDirect();
        case 3: return this.computeResultStep();
      }
    }
    return [];
  }

  /**
   * 第一步：展示算式 - 两个数字各3列并排
   */
  computeStep0() {
    const baseY = LAYOUT.BASE_Y;
    const columns = [];

    /* num1 组 - 3列居中于 GROUP1_CENTER */
    const g1Width = getGroupWidth(3);
    const g1StartX = LAYOUT.GROUP1_CENTER - g1Width / 2;
    const g1Pos = getColumnPositions(g1StartX, 3);
    this.num1Cols.forEach((col, i) => {
      columns.push({ id: `a-col-${i}`, filled: col.filled, x: g1Pos[i], y: baseY });
    });

    /* num2 组 - 3列居中于 GROUP2_CENTER */
    const g2Width = getGroupWidth(3);
    const g2StartX = LAYOUT.GROUP2_CENTER - g2Width / 2;
    const g2Pos = getColumnPositions(g2StartX, 3);
    this.num2Cols.forEach((col, i) => {
      columns.push({ id: `b-col-${i}`, filled: col.filled, x: g2Pos[i], y: baseY });
    });

    return columns;
  }

  /**
   * 第二步：数位分割 - 十位满列归左区，个位列归右区
   */
  computeStep1() {
    const baseY = LAYOUT.BASE_Y;
    const columns = [];

    /* 十位区：所有满10的列 */
    const allTens = [
      ...this.num1Tens.map(c => ({ id: `a-col-${c.colIdx}`, filled: 10 })),
      ...this.num2Tens.map(c => ({ id: `b-col-${c.colIdx}`, filled: 10 })),
    ];
    const tensPos = getColumnPositions(LAYOUT.TENS_ZONE_X, allTens.length);
    allTens.forEach((col, i) => {
      columns.push({ ...col, x: tensPos[i], y: baseY });
    });

    /* 个位区：不满10且>0的列 */
    const allOnes = [
      ...this.num1Ones.map(c => ({ id: `a-col-${c.colIdx}`, filled: c.filled })),
      ...this.num2Ones.map(c => ({ id: `b-col-${c.colIdx}`, filled: c.filled })),
    ];
    const onesPos = getColumnPositions(LAYOUT.ONES_ZONE_X, allOnes.length);
    allOnes.forEach((col, i) => {
      columns.push({ ...col, x: onesPos[i], y: baseY });
    });

    return columns;
  }

  /**
   * 加法第三步：个位归并
   */
  computeStep2Addition() {
    const baseY = LAYOUT.BASE_Y;
    const columns = [];

    /* 十位区不变 */
    const allTens = [
      ...this.num1Tens.map(c => ({ id: `a-col-${c.colIdx}`, filled: 10 })),
      ...this.num2Tens.map(c => ({ id: `b-col-${c.colIdx}`, filled: 10 })),
    ];
    const tensPos = getColumnPositions(LAYOUT.TENS_ZONE_X, allTens.length);
    allTens.forEach((col, i) => {
      columns.push({ ...col, x: tensPos[i], y: baseY });
    });

    /* 个位合并 */
    const onesSum = this.aOnesVal + this.bOnesVal;
    if (onesSum > 0) {
      const mergeCols = decomposeNumber(onesSum).filter(c => c.filled > 0);
      const mergePos = getColumnPositions(LAYOUT.ONES_ZONE_X, mergeCols.length);
      mergeCols.forEach((col, i) => {
        columns.push({ id: `merge-${i}`, filled: col.filled, x: mergePos[i], y: baseY });
      });
    }

    return columns;
  }

  /**
   * 减法(无需借位)第三步：直接相减
   */
  computeStep2SubDirect() {
    const baseY = LAYOUT.BASE_Y;
    const columns = [];

    /* 十位区：减去num2的十位后剩余 */
    const remainingTens = this.aTensCount - this.bTensCount;
    const tensPos = getColumnPositions(LAYOUT.TENS_ZONE_X, Math.max(remainingTens, 0));
    for (let i = 0; i < remainingTens; i++) {
      columns.push({ id: `a-col-${i}`, filled: 10, x: tensPos[i], y: baseY });
    }

    /* 个位区：直接相减结果 */
    const resultOnes = this.aOnesVal - this.bOnesVal;
    if (resultOnes > 0) {
      columns.push({ id: 'result-one', filled: resultOnes, x: LAYOUT.ONES_ZONE_X, y: baseY });
    }

    return columns;
  }

  /**
   * 减法(借位)第三步：借位迁移
   * 将一个满10的列从十位区迁移到个位区
   */
  computeStep2Borrow() {
    const baseY = LAYOUT.BASE_Y;
    const columns = [];

    /* 十位区：A的十位减1（被迁移了一个），B的十位不变 */
    const aRemainingTens = this.aTensCount - 1;
    const allTens = [];
    for (let i = 0; i < aRemainingTens; i++) {
      allTens.push({ id: `a-col-${i}`, filled: 10 });
    }
    /* B的十位列保持 */
    this.num2Tens.forEach(c => {
      allTens.push({ id: `b-col-${c.colIdx}`, filled: 10 });
    });
    const tensPos = getColumnPositions(LAYOUT.TENS_ZONE_X, allTens.length);
    allTens.forEach((col, i) => {
      columns.push({ ...col, x: tensPos[i], y: baseY });
    });

    /* 个位区：迁移的满10列 + A原个位 + B个位 */
    const onesItems = [];
    /* 被迁移的列（取A的最后一个十位列） */
    const migratedColIdx = this.num1Tens[this.num1Tens.length - 1].colIdx;
    onesItems.push({ id: `a-col-${migratedColIdx}`, filled: 10 });
    /* A原个位列 */
    this.num1Ones.forEach(c => {
      onesItems.push({ id: `a-col-${c.colIdx}`, filled: c.filled });
    });
    /* B个位列 */
    this.num2Ones.forEach(c => {
      onesItems.push({ id: `b-col-${c.colIdx}`, filled: c.filled });
    });

    const onesPos = getColumnPositions(LAYOUT.ONES_ZONE_X, onesItems.length);
    onesItems.forEach((col, i) => {
      columns.push({ ...col, x: onesPos[i], y: baseY });
    });

    return columns;
  }

  /**
   * 减法(借位)第四步：个位计算
   * 10 - 减数个位 + 原被减数个位
   */
  computeStep3BorrowCompute() {
    const baseY = LAYOUT.BASE_Y;
    const columns = [];

    /* 十位区：A剩余十位 - B十位 */
    const remainingTens = this.aTensCount - 1 - this.bTensCount;
    const tensPos = getColumnPositions(LAYOUT.TENS_ZONE_X, Math.max(remainingTens, 0));
    for (let i = 0; i < remainingTens; i++) {
      columns.push({ id: `a-col-${i}`, filled: 10, x: tensPos[i], y: baseY });
    }

    /* 个位区：迁移列(10-b_ones) + A原个位列 */
    const migratedColIdx = this.num1Tens[this.num1Tens.length - 1].colIdx;
    const migratedRemaining = 10 - this.bOnesVal;

    const onesItems = [];
    if (migratedRemaining > 0) {
      onesItems.push({ id: `a-col-${migratedColIdx}`, filled: migratedRemaining });
    }
    this.num1Ones.forEach(c => {
      onesItems.push({ id: `a-col-${c.colIdx}`, filled: c.filled });
    });

    const onesPos = getColumnPositions(LAYOUT.ONES_ZONE_X, onesItems.length);
    onesItems.forEach((col, i) => {
      columns.push({ ...col, x: onesPos[i], y: baseY });
    });

    return columns;
  }

  /**
   * 最终结果步骤
   */
  computeResultStep() {
    const baseY = LAYOUT.BASE_Y;
    const resultCols = decomposeNumber(this.problem.result).filter(c => c.filled > 0);

    if (resultCols.length === 0) return [];

    const totalWidth = getGroupWidth(resultCols.length);
    const startX = (LAYOUT.VIZ_WIDTH - totalWidth) / 2;
    const positions = getColumnPositions(startX, resultCols.length);

    return resultCols.map((col, i) => ({
      id: `result-${i}`,
      filled: col.filled,
      x: positions[i],
      y: baseY,
    }));
  }

  /* ========================================
     差量更新列柱 DOM
     ======================================== */

  diffUpdateColumns(targetColumns) {
    const targetMap = new Map(targetColumns.map(c => [c.id, c]));
    const currentIds = new Set(this.columnPool.keys());
    const targetIds = new Set(targetMap.keys());

    /* 移除不再需要的列柱 */
    for (const id of currentIds) {
      if (!targetIds.has(id)) {
        const el = this.columnPool.get(id);
        el.style.opacity = '0';
        el.style.transform = 'scale(0.8)';
        el.style.pointerEvents = 'none';
        const elRef = el;
        setTimeout(() => { if (elRef.parentNode) elRef.remove(); }, 400);
        this.columnPool.delete(id);
      }
    }

    /* 更新已有列柱 / 创建新列柱 */
    for (const [id, target] of targetMap) {
      if (this.columnPool.has(id)) {
        const el = this.columnPool.get(id);
        /* 更新位置（CSS transition 自动动画） */
        el.style.left = `${target.x}px`;
        el.style.top = `${target.y}px`;
        el.style.opacity = '1';
        el.style.transform = 'scale(1)';
        /* 更新填充块数 */
        const currentFilled = parseInt(el.dataset.filled || '0', 10);
        if (currentFilled !== target.filled) {
          updateColumnFilled(el, target.filled);
          el.dataset.filled = target.filled;
        }
      } else {
        /* 创建新列柱 */
        const el = createBlockColumn({ id: target.id, filled: target.filled, x: target.x, y: target.y, visible: false });
        el.dataset.filled = target.filled;
        this.vizContainer.appendChild(el);
        this.columnPool.set(id, el);
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
     辅助元素渲染
     ======================================== */

  renderAuxElements(step) {
    if (this.isBorrow) {
      switch (step) {
        case 0: this.auxStep0(); break;
        case 1: this.auxStep1(); break;
        case 2: this.auxStep2Borrow(); break;
        case 3: this.auxStep3BorrowCompute(); break;
      }
    } else {
      switch (step) {
        case 0: this.auxStep0(); break;
        case 1: this.auxStep1(); break;
        case 2: this.isAddition ? this.auxStep2Addition() : this.auxStep2SubDirect(); break;
      }
    }
  }

  /** 展示算式辅助元素 */
  auxStep0() {
    const baseY = LAYOUT.BASE_Y;
    const labelY = baseY + LAYOUT.COLUMN_TOTAL_HEIGHT + 20;

    this.addAux(createGroupValueLabel(this.problem.num1, LAYOUT.GROUP1_CENTER - 15, labelY));
    this.addAux(createGroupValueLabel(this.problem.num2, LAYOUT.GROUP2_CENTER - 15, labelY));

    const opY = baseY + LAYOUT.COLUMN_TOTAL_HEIGHT / 2 - 14;
    this.addAux(createOperatorElement(this.problem.operator, LAYOUT.OPERATOR_X, opY));
  }

  /** 数位分割辅助元素 */
  auxStep1() {
    const tensLabel = createZoneLabel('十位', 'left');
    tensLabel.classList.add('visible');
    this.addAux(tensLabel);

    const onesLabel = createZoneLabel('个位', 'right');
    onesLabel.classList.add('visible');
    this.addAux(onesLabel);

    const divider = createZoneDivider();
    divider.classList.add('visible');
    this.addAux(divider);
  }

  /** 加法个位归并辅助元素 */
  auxStep2Addition() {
    this.auxStep1(); /* 保留区域标签 */

    const baseY = LAYOUT.BASE_Y;
    const onesSum = this.aOnesVal + this.bOnesVal;
    if (onesSum > 0) {
      const hintY = baseY + LAYOUT.COLUMN_TOTAL_HEIGHT + 20;
      const hint = createHintElement(
        `${this.aOnesVal} + ${this.bOnesVal} = ${onesSum}`,
        LAYOUT.ONES_ZONE_X, hintY, 200
      );
      this.addAux(hint);
    }
  }

  /** 减法直接计算辅助元素 */
  auxStep2SubDirect() {
    this.auxStep1();

    const baseY = LAYOUT.BASE_Y;
    const resultOnes = this.aOnesVal - this.bOnesVal;
    const hintY = baseY + LAYOUT.COLUMN_TOTAL_HEIGHT + 20;
    const hint = createHintElement(
      `${this.aOnesVal} − ${this.bOnesVal} = ${resultOnes}`,
      LAYOUT.ONES_ZONE_X, hintY, 200
    );
    this.addAux(hint);
  }

  /** 借位迁移辅助元素 */
  auxStep2Borrow() {
    this.auxStep1();

    const baseY = LAYOUT.BASE_Y;
    /* 借位标记 */
    const borrowEl = document.createElement('div');
    borrowEl.className = 'borrow-arrow visible anim-scale-in';
    const aTensWidth = getGroupWidth(this.aTensCount);
    borrowEl.style.left = `${LAYOUT.TENS_ZONE_X + aTensWidth + 12}px`;
    borrowEl.style.top = `${baseY + LAYOUT.COLUMN_TOTAL_HEIGHT / 2}px`;
    borrowEl.textContent = '← 借1当10';
    this.addAux(borrowEl);
  }

  /** 借位计算辅助元素 */
  auxStep3BorrowCompute() {
    this.auxStep1();

    const baseY = LAYOUT.BASE_Y;
    const resultOnes = 10 - this.bOnesVal + this.aOnesVal;
    const hintY = baseY + LAYOUT.COLUMN_TOTAL_HEIGHT + 20;
    const hint = createHintElement(
      `10 − ${this.bOnesVal} + ${this.aOnesVal} = ${resultOnes}`,
      LAYOUT.ONES_ZONE_X, hintY, 200
    );
    this.addAux(hint);
  }

  /* ========================================
     DOM 工具方法
     ======================================== */

  addAux(el) {
    this.vizContainer.appendChild(el);
    this.auxElements.push(el);
  }

  clearAuxElements() {
    for (const el of this.auxElements) el.remove();
    this.auxElements = [];
  }

  destroy() {
    for (const [, el] of this.columnPool) el.remove();
    this.columnPool.clear();
    this.clearAuxElements();
  }
}
