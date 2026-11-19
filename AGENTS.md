# AGENTS.md

## 项目概览

两位数以下加减法练习网页应用项目，基于原生 HTML 构建。

## 技术栈

- HTML5 (原生静态页面)
- Python3 http.server (开发服务器)

## 项目结构

```
.
├──assets/
├──js/
├──css/
├──index.html        # 空白页面入口
├── .coze            # 项目配置
└── AGENTS.md        # 项目说明
```

## 构建与运行

- 开发启动: `python3 -m http.server ${DEPLOY_RUN_PORT} --bind 0.0.0.0`
- 无构建步骤，无依赖安装

## 代码规范

- 样式文件放入css文件目录，样式每一个模块添加详细功能中文注释
- 脚本文件放入js目录，js脚本以type="module"的模式引入，每一个方法和主要功能都添加详细中文注释
  - 将功能拆分成不同脚本文件，引入主脚本文件，主脚本文件接入index.html文件
