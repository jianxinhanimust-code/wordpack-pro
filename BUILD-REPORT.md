# 开发与验收记录

## 阶段 0 · 底座审计

- 克隆不背单词 Lite 的 `76cd14c1aef82ff1d34a9cbd7ef8049529bfa9cf`。基线 67 个单元测试和构建通过，Vite 开发服务启动成功。保留词书懒载、数据导入基础和系统朗读接口。
- 基线在完整依赖安装后有 20 个审计告警，涉及旧桌面打包依赖和样式工具。新版聚焦 Web/PWA，更新并收敛了依赖。安装 Vite 时需要保留平台的可选原生组件。
- 底座代码的许可证为 MIT。其词表来源没有可核实的独立许可证文件，应用数据改用固定版本的 MIT ECDICT。其余参考项目用于产品对照。WordDrill 的分阶段练习、TypeWords 和 Qwerty Learner 的拼写反馈、OpenWords 的阅读语境分别用于梳理设计。WordDrill 和 OpenWords 无可核实的仓库许可，TypeWords 和 Qwerty Learner 为 GPL-3.0，未使用这些项目的代码、词库或素材。
- 原版拆词记在普通 HTTP 检查返回 429，Chrome 实际打开为 Qoder Sites 的“暂时无法访问此站点”页面。最终视觉和动效依据任务书独立制作。
- 主要参考链接见下。 [底座](https://github.com/TheObservantDeveloper2026/not-back-words-lite) · [FSRS](https://github.com/open-spaced-repetition/ts-fsrs) · [WordDrill](https://github.com/DrivingGodJ/word-drill) · [TypeWords](https://github.com/zyronon/TypeWords) · [OpenWords](https://github.com/Xlichard/OpenWords) · [Qwerty Learner](https://github.com/RealKai42/qwerty-learner) · [原版拆词记](https://wordpack-cards-gv0naimskon.qoder.zone/)

## 阶段 1 · 学习与数据

新版默认进入大学英语六级。错词保留在原能力轨道，认词评分可不做拼写。测试覆盖到期优先、能力分轨、同词身份、旧记录迁移、损坏备份拒绝、原子写入与并发写入。测试产生的记录位于隔离浏览器上下文。

## 阶段 2 · 撕包与视觉

Pointer Events 捕获触点，阈值前用 rAF 更新拉伸、褶皱、撕线高光和封口位置。过阈值后提交本地收藏，包装分离并揭晓卡片。CSS 透视和背面可见性控制翻转，词头哈希决定稳定的卡面。CSS 光束连接已收录关系。

Chrome 1440×950 桌面和 393×852 Android 模拟在相同测试机上完成拖动、松手回弹、完整揭晓和评分。一次约 2.35 秒的 rAF 采样中，桌面中位数 6.1 ms、P95 6.3 ms、最长帧 230.5 ms。移动模拟中位数 6.1 ms、P95 6.8 ms、最长帧 48.2 ms。测试机的 Chrome 调度频率高于 60 Hz。该测量记录了主线程帧间隔，仍需在实体 Android 手机上复测。

主题使用项目原创画面 `public/foil-studio.webp`。主视觉由内置 ImageGen 生成，使用下列提示词。

> Original editorial 3D product photography hero asset for a premium dark English vocabulary collectible trading card web app. Wide 3:2 landscape, seamless dark indigo-black studio environment (#110e1e), restrained smoky violet lighting. On the CENTER RIGHT one large realistic tall sealed trading card metallic foil booster pouch hovering above a low circular obsidian display dais with an elegant subtle thin lavender illuminated rim, three quarter view with a slight clockwise rotation, sharp focus, black plum brushed metallic crimped foil, embossed concentric ultraviolet orbital etching with a single brilliant cut purple crystal diamond centerpiece. Pouch has elegant tiny uppercase silver title 'WORDPACK' and small 'CET–6' mark. A few fine star-dust points and elegant technical orbital line details. Object is big and very readable, glamour lighting, refined museum display, dark neutral violet shadows, rich and tactile, no neon overload. Keep left quarter near black, keep far right and all corners mostly very dark so it integrates with CSS. Pack fully in frame, fill almost entire image height, angle moderate. No UI, no people, no second pouch, no extra text, no watermark.

## 阶段 3 · 练习与图鉴

加入六级冲刺、快速认词、拼写、听音识词、错词专项、语境辨义和听写。图鉴可搜索、筛选、收藏、查看独立能力历史。共鸣边来自词典和词源资料，支持词源、近义、反义及易混。统计由实际学习事件生成。

首页增加四级和六级入口，分别配置词包、冲刺、词书范围和统计。跨专区的同一词共享 FSRS 状态。旧版备份缺少专区字段时，会从原有词书设置推导默认专区。

## 阶段 4 · 离线和可选 AI

生产缓存包括界面、四级与六级词书模块、本地字体和画面；其他词书（GRE、TOEFL、高考、中考、基础）不再预缓存，改为第一次打开时运行时缓存，首屏少下载约 2.2 MB。Chrome 测试先装载 Service Worker，再断网启动、切换此前未打开的词书、拆包、评分和刷新。AI 通过本机模拟 OpenAI 兼容服务验证生成、标记和反馈保存，真实服务尚无凭据。DeepSeek Harness 交叉审查尝试返回官方线路缺少 API Key，未发起模型请求。

## 最终检查

| 检查 | 结果 |
| --- | --- |
| Vitest | 39 项通过 |
| TypeScript 严格检查和 Vite 生产构建 | 通过。Vite 对部分懒载词表发出体积提示 |
| Playwright Chrome | 8 项通过，含桌面、Android 视口、五张不同卡面、移动端换行、四六级切换和刷新后恢复 |
| 离线生产版 | 22 个文件预缓存（四级/六级与界面），断网重载、换词书、拆包、评分通过；首次打开的高考词书在联网时进入缓存 |
| AI 本地代理 | 2 项服务端测试通过，另以本地模拟服务验证浏览器流程 |
| 原生 Web Speech | 测试机 Chrome 收到真实朗读的开始和结束事件 |
| 依赖审计 | 0 个已知漏洞 |

单元测试从 83 项降到 39 项，是因为删掉了切换 FSRS 后遗留的 SM-2 调度器（`srs.ts`）和旧判分模块（`judge.ts`）：这两个模块已不再被应用引用，原 46 项测试只覆盖死代码。新增 2 项启动恢复测试覆盖损坏数据下的启动与自救。

桌面和 Android 视口截图位于 `release/screenshots/`。手机测试使用 Chrome 模拟触屏和视口。

### 界面与卡牌更新

用 Canvas 绘制 16 类原创卡面。字词种子决定几何、画框、配色和细节，同一个词在不同页面保持相同卡面。拆包加入随距离变化的撕开进度条。1440 px 视口单排展示，393 px 和 320 px 视口分两排展示，光束按实际卡片位置连接，三个尺寸均无水平溢出。

再次用 Chrome 打开原版参考站，返回 HTTP 429。实际响应体是 `sites_daily_pv_quota_exceeded`，即静态托管方的**每日访问量配额**用完，`reset_at` 为 2026-11-23T00:00:00Z（北京时间 11 月 23 日 08:00），不是站点故障。因此本轮视觉与动效仍未能与原版对照。 [原版拆词记](https://wordpack-cards-gv0naimskon.qoder.zone/)

### 全息卡面与双面闪卡

参考 Flashcards 的正面提示、背面释义结构，及 Pokémon Cards CSS 的视角反光思路。WordPack Pro 使用自己的图案和实现。揭晓后可放大单张卡片，触屏或鼠标点击翻面，也可以用方向键换卡。已编校的词优先显示简释和一条常用搭配，其余从词书读取释义。 [Flashcards Skill](https://github.com/jalliet/flashcards/blob/main/SKILL.md) · [全息卡面示例](https://github.com/simeydotme/pokemon-cards-css)

原创黑曜石展台位于 `public/obsidian-stage.webp`，使用内置 ImageGen 生成。它与词库一起预缓存。生成提示词如下。

> A horizontal 3:2 environment plate for a very refined digital collectible card reveal experience, photoreal premium product photography studio with theatrical but restrained light. A large low elliptical black obsidian display plinth with layered carved edges occupies the bottom third, seen from slightly above, with a single extremely thin warm silver rim and one faint lavender reflected edge. Behind it in middle distance, a quietly monumental circular dark smoke-gray carved glass portal set into a blackened indigo wall, concentric concentric engraved rings very subtle, dim diffuse champagne glints and smoky blue edge illumination. Very dark background, elegant dark-on-dark detail visible, more black graphite than bright purple, careful tonal control, no harsh glows. Left and right edges fade to almost black #100d17. Center upper half nearly black and uncluttered to hold white text and foreground cards. The plinth feels substantial and takes up a lot of width, positioned a little below center, without anything standing on it. Studio camera straight on centered symmetry, slight depth of field, original design. No foil packages, people, cards, lettering, logos, interface, floating gems, lens flares, sparks, starfields or watermarks. Premium tactile black marble, carbon slate and a subdued metallic edge.

## 收尾修复（11 月 22 日夜间）

在生产服务器上复跑全部检查后发现并修掉的问题：

- **CSP 拦住内联字体**：`server/start.mjs` 的 CSP 只有 `default-src 'self'`，而 Vite 会把 Manrope 的西里尔子集（3.6 KB）内联成 `data:font/woff2`，浏览器控制台报 `font-src` 违规。补 `font-src 'self' data:`，并显式声明 `script-src`、`worker-src`，Service Worker 注册不再走 `default-src` 回退。
- **启动失败会永久锁死**：旧版 `bbdict.*` 键里只要有一个坏 JSON，`legacyData()` 的 `JSON.parse` 就抛错，整个应用停在错误页，「重试」只会重新加载到同一状态（已用注入坏键复现）。现在每个旧键独立 try/catch 并跳过；错误页增加「下载原始记录」和「清空并重新开始」两个出口，新增 `readRawRecord()` / `resetVault()` 绕开校验读写。`vault.rescue.test.ts` 覆盖这两条路径。
- **启动页没有样式**：`App.tsx` 引用的 `.boot-screen`、`.spin` 在 CSS 里不存在，首屏是左上角裸文本、加载图标也不转。已补样式与 keyframes，并尊重 `prefers-reduced-motion`。
- **词书配色丢了一半**：数据里声明了 emerald、sky、indigo、blue、violet、rose、amber 七色，`index.css` 只实现了其中四种，导致「我的词书」六个图标同色。补齐四种，并保留一句注释说明数据与样式的对应关系。
- **箔包轨道环**：`.foil-orbit.orbit-a` 缺失，三层同心环只有两层有变形。
- **删除死代码**：`core/srs.ts`（旧 SM-2 调度器）、`core/judge.ts`（旧判分）连同 46 项只测死代码的单元测试；`core/storage.ts` 从 246 行收敛到只剩旧版自定义词书读取；`speech.ts` 删除两个无人调用的判分函数；`books.ts` 删除 Tailwind 时代遗留的 `BOOK_COLORS`。
- **手机与分享**：服务端新增 `WORDPACK_HOST`，可绑定 `0.0.0.0` 供局域网手机访问；Pages 工作流改为推送到 `main` 自动发布，并在构建前执行 typecheck 与 lint。
- **首屏瘦身**：预缓存从 27 个文件（3.91 MB）收敛到 22 个（四级/六级 + 界面），GRE/TOEFL/高考/中考/基础改为首次打开时运行时缓存；离线检查新增断言，确认未打开的词书不再预缓存、打开过的会进缓存。
- **清掉上游遗留**：删除 `electron/` 与 `capacitor.config.ts`（身份仍是 `com.notbemoji.app` / 不背单词 Lite，项目已不走原生打包）。

## 词库再生成

`python scripts/build_ecdict.py <ECDICT 固定版本的 ecdict.csv 路径>`。源码和数据许可由打包器与静态页面一起输出。阅读专题的例句、搭配和关系在 `src/data/editorial.ts`。

## 后续

实体 Android 性能和安装测试、APK 打包、完整语料增强、跨设备同步。

