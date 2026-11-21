/**
 * 主入口模块 - 应用初始化与事件绑定
 */

import { generateProblem } from './utils.js';
import { Stepper } from './stepper.js';
import { initPullRefresh } from './pull-refresh.js';

/* 当前步进器实例 */
let stepper = null;

/**
 * 初始化应用
 */
function initApp() {
  const vizContainer = document.getElementById('viz-container');
  const problemDisplay = document.getElementById('problem-display');
  const stepLabel = document.getElementById('step-label');
  const btnPrev = document.getElementById('btn-prev');
  const btnNext = document.getElementById('btn-next');
  const indicatorsContainer = document.getElementById('step-indicators');

  /**
   * 生成新题目并初始化步进器
   */
  function startNewProblem() {
    if (stepper) stepper.destroy();

    const problem = generateProblem();
    stepper = new Stepper(problem, vizContainer, problemDisplay, stepLabel);

    /* 动态生成步骤指示器 */
    rebuildStepIndicators(stepper.totalSteps);

    stepper.onStepChange = (step) => {
      updateControls(step);
      updateStepDots(step);
    };

    updateControls(0);
    updateStepDots(0);
  }

  /**
   * 根据总步骤数重建步骤指示器圆点
   * @param {number} total - 总步骤数
   */
  function rebuildStepIndicators(total) {
    indicatorsContainer.innerHTML = '';
    for (let i = 0; i < total; i++) {
      const dot = document.createElement('span');
      dot.className = 'step-dot' + (i === 0 ? ' active' : '');
      dot.dataset.step = i;
      dot.addEventListener('click', () => stepper.goToStep(i));
      indicatorsContainer.appendChild(dot);
    }
  }

  /**
   * 更新导航按钮状态
   */
  function updateControls(step) {
    btnPrev.disabled = step === 0;
    if (step === stepper.totalSteps - 1) {
      btnNext.textContent = '下一题';
    } else {
      btnNext.textContent = '下一步 →';
    }
    btnNext.disabled = false;
  }

  /**
   * 更新步骤圆点状态
   */
  function updateStepDots(step) {
    const dots = indicatorsContainer.querySelectorAll('.step-dot');
    dots.forEach((dot, i) => {
      dot.classList.remove('active', 'completed');
      if (i === step) {
        dot.classList.add('active');
      } else if (i < step) {
        dot.classList.add('completed');
      }
    });
  }

  /* 绑定按钮事件 */
  btnPrev.addEventListener('click', () => stepper.prev());

  btnNext.addEventListener('click', () => {
    if (stepper.isLastStep()) {
      startNewProblem();
    } else {
      stepper.next();
    }
  });

  /* 键盘快捷键 */
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

  /* 启动 */
  startNewProblem();
}

document.addEventListener('DOMContentLoaded', initApp);
document.addEventListener('DOMContentLoaded', initPullRefresh);
