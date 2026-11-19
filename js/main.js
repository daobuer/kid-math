/**
 * 主入口模块 - 应用初始化与事件绑定
 * 负责初始化页面、生成题目、绑定按钮事件
 */

import { generateProblem } from './utils.js';
import { Stepper } from './stepper.js';

/* 当前步进器实例 */
let stepper = null;

/**
 * 初始化应用
 * 获取DOM元素引用，生成第一道题目，绑定事件
 */
function initApp() {
  /* 获取DOM元素 */
  const vizContainer = document.getElementById('viz-container');
  const problemDisplay = document.getElementById('problem-display');
  const stepLabel = document.getElementById('step-label');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const btnNew = document.getElementById('btn-new');
  const stepDots = document.querySelectorAll('.step-dot');

  /**
   * 生成新题目并初始化步进器
   */
  function startNewProblem() {
    /* 销毁旧的步进器 */
    if (stepper) {
      stepper.destroy();
    }

    /* 生成新题目 */
    const problem = generateProblem();

    /* 创建新的步进器实例 */
    stepper = new Stepper(problem, vizContainer, problemDisplay, stepLabel);

    /* 设置步骤变更回调 */
    stepper.onStepChange = (step) => {
      updateControls(step);
      updateStepDots(step);
    };

    /* 初始化按钮状态 */
    updateControls(0);
    updateStepDots(0);
  }

  /**
   * 更新导航按钮的启用/禁用状态
   * @param {number} step - 当前步骤
   */
  function updateControls(step) {
    btnPrev.disabled = step === 0;
    if (step === stepper.totalSteps - 1) {
      btnNext.textContent = '下一题';
      btnNext.disabled = false;
    } else {
      btnNext.textContent = '下一步 →';
      btnNext.disabled = false;
    }
  }

  /**
   * 更新步骤指示器圆点状态
   * @param {number} step - 当前步骤
   */
  function updateStepDots(step) {
    stepDots.forEach((dot, i) => {
      dot.classList.remove('active', 'completed');
      if (i === step) {
        dot.classList.add('active');
      } else if (i < step) {
        dot.classList.add('completed');
      }
    });
  }

  /* 绑定上一步按钮 */
  btnPrev.addEventListener('click', () => {
    stepper.prev();
  });

  /* 绑定下一步按钮 */
  btnNext.addEventListener('click', () => {
    if (stepper.isLastStep()) {
      /* 最后一步点击 → 生成新题目 */
      startNewProblem();
    } else {
      stepper.next();
    }
  });

  /* 绑定换一题按钮 */
  btnNew.addEventListener('click', () => {
    startNewProblem();
  });

  /* 绑定步骤圆点点击 */
  stepDots.forEach((dot, i) => {
    dot.addEventListener('click', () => {
      stepper.goToStep(i);
    });
  });

  /* 绑定键盘快捷键 */
  document.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight' || e.key === ' ') {
      e.preventDefault();
      if (stepper.isLastStep()) {
        startNewProblem();
      } else {
        stepper.next();
      }
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      stepper.prev();
    }
  });

  /* 启动第一道题目 */
  startNewProblem();
}

/* 页面加载完成后初始化 */
document.addEventListener('DOMContentLoaded', initApp);
