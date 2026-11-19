# AGENTS.md

## 项目概览

空白网页应用项目，基于原生 HTML 构建，无任何业务逻辑和 UI 内容。

## 技术栈

- HTML5 (原生静态页面)
- Python3 http.server (开发服务器)

## 项目结构

```
.
├── index.html       # 空白页面入口
├── .coze            # 项目配置
└── AGENTS.md        # 项目说明
```

## 构建与运行

- 开发启动: `python3 -m http.server ${DEPLOY_RUN_PORT} --bind 0.0.0.0`
- 无构建步骤，无依赖安装

## 代码规范

- HTML 文件保持最简结构，仅包含基础 doctype、head、body 标签
- 无外部依赖，无 JS/CSS 文件
