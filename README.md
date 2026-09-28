# 错字消灭器

面向小学生的移动端 PWA，用于记录和复习实际写错的中文词语。

## 当前范围

- React + Vite + TypeScript 项目
- PWA 基础配置
- 全局视觉样式和设计变量
- 6 个移动端页面与底部导航
- PRD V1 领域模型、复习调度和 Dictation Session 流程
- 通过独立 storage service 封装的本地持久化、schema 校验和迁移入口
- 完整 JSON 备份导入/导出与覆盖前校验
- 基于设备中文语音的 TTS 自动听写、重播和声音偏好
- 听写 Session 的应用内导航、浏览器后退和刷新退出保护
- 完整安装图标、离线页面导航与本地中文字体缓存

## 页面路由

| 页面 | 路由 |
| --- | --- |
| 首页 | `/` |
| 录入错词 | `/add` |
| 今日听写 | `/dictation` |
| 核对答案 | `/review` |
| 错词库 | `/library` |
| 设置 | `/settings` |

## 启动

```bash
pnpm install
pnpm dev
```

建议使用浏览器设备模式，以 `390 × 844` 检查页面。

## 验证

```bash
pnpm test
pnpm lint
pnpm build
pnpm verify:pwa
```

`verify:pwa` 会检查生产构建中的 Web App Manifest、普通/自适应安装图标、离线导航回退和字体缓存配置。

## 目录结构

```text
src/
├── app/                 # 路由与应用状态
├── backup/              # JSON 备份创建、校验与下载
├── components/          # 可复用组件
│   ├── layout/
│   └── navigation/
├── domain/              # 纯业务规则及单元测试
├── pages/               # 页面组件
├── storage/             # localStorage、schema 与迁移边界
├── styles/              # 全局样式、页面样式与设计变量
├── tts/                 # 中文声音发现与 SpeechSynthesis 播放
├── types/               # 领域数据结构
└── utils/               # 本地日期等通用工具
```
