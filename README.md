# WordPack Pro｜拆词记进阶版

面向大学英语四级和六级的本地优先英语词卡应用。使用 React、严格 TypeScript、Vite、ts-fsrs 和 IndexedDB。支持电脑浏览器和 Android 浏览器的响应式 PWA。

## 运行

需要 Node.js 22.12+ 或 24 LTS，以及 npm。请保留 npm 的平台可选依赖，Vite 使用其中的原生构建组件。

```powershell
cd C:\Users\Hanji\WordPack-Pro
npm ci
npm run dev -- --host 127.0.0.1 --port 5173
```

开发地址 [http://127.0.0.1:5173/](http://127.0.0.1:5173/)。用生产版本验证离线缓存。

```powershell
npm run build
npm start
```

生产地址 [http://127.0.0.1:4173/](http://127.0.0.1:4173/)。发布时可将 `dist/` 上传至 HTTPS 静态站点。默认构建支持子路径。如果部署工具要求固定基路径，用 `PAGES_BASE=/path/` 配合 `npm run build:pages`。

生产站点首次在线访问、Service Worker 安装完成后可以离线学习。Android Chrome 可从浏览器菜单安装，需从 HTTPS 或本机安全上下文打开。学习记录与站点的协议、域名和端口绑定，在开发预览与生产预览间可用 JSON 导出和恢复。

## 手机与分享

`npm start` 默认只绑定回环地址。要让同一局域网内的手机打开，用 `WORDPACK_HOST=0.0.0.0 npm start`，再访问电脑的局域网地址，例如 `http://192.168.1.5:4173/`。

局域网 HTTP 不是安全上下文：Service Worker 不会注册，因此**不能离线，也不能安装成独立应用**，只能加到桌面当快捷方式。要把链接发给别人、同时保留安装与离线能力，必须部署到 HTTPS 静态站点。仓库内的 `.github/workflows/deploy.yml` 在推送到 `main` 时自动构建并发布到 GitHub Pages；首次需要在仓库 Settings → Pages 把 Source 设为 GitHub Actions，地址形如 `https://<用户名>.github.io/<仓库名>/`。资源前缀由 `npm run build:pages` 按仓库名自动推导，仓库名与 `package.json` 的 `name` 不同时用 `PAGES_REPO=<仓库名>`。

## 功能

- **四级与六级专区**从首页切换。四级有 3,847 词，使用蓝色词包，六级有 5,402 词，使用紫色词包。当前词书决定拆包、冲刺、复习以及默认图鉴和统计范围。同一词在两套词书中共享 FSRS 记忆状态，各词书的答题记录和今日新词目标按当前词书查看。
- **拆包**支持连续拖动、封口形变、回弹、逐张 3D 翻转、鼠标与触控光泽、键盘或直接打开。可以跳过，或在偏好设置中降级动画、关闭动画和拆包音效。
- **卡面纹样**有 16 类金属箔构图，包括拱门、水纹、蝶翼和棱镜。每个单词的种子决定构图、配色和细节，同一词在拆包、学习和图鉴中保持一致。手机端分两排展示，相关词由光束连接。点选任意卡片可放大并翻到背面查看释义，键盘方向键可切换卡片。
- **学习**有四级与六级冲刺、快速认词、拼写、听音识词、听写、语境辨义和错词复测。分开调度认词、拼写及听音。Again、Hard、Good、Easy 对应 FSRS 评分，当前词书的到期任务优先。
- **词书**有 CET-6 5,402 词、CET-4 3,847 词、33 词阅读专题、基础、中考、高考、TOEFL、GRE，以及独立的真题个人生词本。支持 TXT、CSV、TSV 文件内容和 JSON 导入。公共词书与个人词书可引用同一词的学习进度。
- **图鉴**支持查词、词书筛选、单独收藏、词卡状态、历史评分和可平移缩放的共鸣关系。默认词包里的 `adapt`、`adopt` 可展示易混词共鸣。
- **统计**包括新词、到期任务、趋势、连续学习、收藏成就和 FSRS 预估认词保持率。
- **数据**自动保存在 IndexedDB。备份包含词书、设置、评分、收藏和 AI 内容反馈。恢复先校验，写入在同一事务内执行。

词表接受 UTF-8 文本，例如：

```csv
word,meaning
sustain,维持
"coherent","连贯的，条理清楚的"
```

旧版不背单词 Lite 的 v1 JSON 可在设置中恢复。同一来源内的旧版本地进度也会在首次打开时尝试迁移。保留原 SM-2 数据、到期日、复习与错误次数，FSRS 难度和稳定性从旧数据估算，迁移前的评分历史以旧有汇总数据为准。浏览器清除站点数据会清除学习记录。

## 可选 AI 辅导

基础模块运行时无需配置 AI。在本机 `npm start` 之前为服务进程设置下列环境变量，通过单词详解中的 AI 学习助手主动提交请求。

| 环境变量 | 用途 |
| --- | --- |
| `WORDPACK_AI_BASE_URL` | OpenAI 兼容基地址。OpenAI 默认是 `https://api.openai.com/v1`，DeepSeek 是 `https://api.deepseek.com` |
| `WORDPACK_AI_MODEL` | 账户支持的模型标识 |
| `WORDPACK_AI_API_KEY` | 仅注入服务端环境，客户端和备份均不含密钥 |
| `WORDPACK_PORT` | 本地生产服务器端口，默认 4173 |
| `WORDPACK_HOST` | 本地生产服务器绑定地址，默认 `127.0.0.1`。设为 `0.0.0.0` 后同一局域网内的手机可以访问，例如 `http://192.168.1.5:4173/` |

当前 AI 代理绑定本机回环接口。公网启用 AI 需要部署带鉴权、配额及服务端密钥管理的代理。静态部署可以独立使用基础学习功能。

## 检查

```powershell
npm test
npm run typecheck
npm run lint
npm run build
npm run test:e2e
npm run test:offline
npm run test:server
npm audit
```

端到端测试默认使用本机 Chrome。离线测试也可用 Playwright 下载的 Chromium，安装后设置 `WORDPACK_CHROMIUM=playwright`；端到端测试用 `PLAYWRIGHT_CHANNEL=chromium` 切换。详见 [开发与验收记录](BUILD-REPORT.md)。

## 已知边界

- 四六级归类取自 ECDICT。阅读专题有 33 条自编用法例句和搭配，以及人工核对的共鸣关系。大词书其余条目以 ECDICT 释义和通用音标为主，部分无音标或没有英美双音标、例句和词源。
- 发音使用系统英文语音。有离线声音包的设备可离线朗读，其他设备可能需要系统设置或联网。找不到可用语音时可切换到认词。
- 148 条个人阅读生词原文件尚未提供，个人真题词本可从界面导入。
- Android 已做浏览器尺寸与触摸模拟。实体机性能、安装引导和 APK 构建列入后续验收，当前环境无可用 Android SDK。
- 后续词汇内容可补齐更多英美音标、真实语料和经校订的关联。跨设备同步暂未接入。

## 上游与授权

基于 [不背单词 Lite](https://github.com/TheObservantDeveloper2026/not-back-words-lite) 的 MIT 代码，词书改用同样采用 MIT 许可的 ECDICT。第三方归属见 [LICENSE](LICENSE)、[来源与许可](THIRD_PARTY_NOTICES.md) 和生产构建内的 `THIRD_PARTY_LICENSES.txt`。
