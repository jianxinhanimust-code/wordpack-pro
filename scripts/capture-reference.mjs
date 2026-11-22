#!/usr/bin/env node
/**
 * 一次性抓取参考站（原版拆词记）的可对照素材。
 *
 * 参考站用的是「每日访问量配额」的静态托管：配额用完就全是 429，
 * 北京时间每天 08:00 重置。所以这个脚本刻意只做**一次页面加载**，
 * 其余视口切换、点击、滚动都在同一页里完成，不额外消耗配额。
 *
 * 用法：
 *   node scripts/capture-reference.mjs                    # 抓默认参考站
 *   node scripts/capture-reference.mjs --url <URL> --out <目录>
 *   node scripts/capture-reference.mjs --retry 3 --wait 300   # 429 时重试
 */
import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { chromium } from 'playwright'

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const argv = process.argv.slice(2)
const flag = (name, fallback) => {
  const index = argv.indexOf(`--${name}`)
  return index >= 0 && argv[index + 1] ? argv[index + 1] : fallback
}
const url = flag('url', 'https://wordpack-cards-gv0naimskon.qoder.zone/')
const stamp = new Date().toISOString().slice(0, 10)
const out = flag('out', join(root, 'refs', `reference-${stamp}`))
const retries = Number(flag('retry', '1'))
const waitSeconds = Number(flag('wait', '300'))

async function probe() {
  const response = await fetch(url, { headers: { 'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/131 Safari/537.36' } })
  const body = await response.text().catch(() => '')
  return { status: response.status, body: body.slice(0, 400) }
}

async function waitForQuota() {
  for (let attempt = 1; attempt <= retries; attempt += 1) {
    const { status, body } = await probe()
    if (status === 200) return true
    console.error(`[${attempt}/${retries}] HTTP ${status}${body ? ` · ${body.replace(/\s+/g, ' ').slice(0, 160)}` : ''}`)
    if (attempt < retries) {
      console.error(`  ${waitSeconds}s 后重试…`)
      await new Promise(resolve => setTimeout(resolve, waitSeconds * 1000))
    }
  }
  return false
}

if (!(await waitForQuota())) {
  console.error('参考站仍不可用（配额未恢复）。这个脚本不会绕过限制，稍后再跑。')
  process.exit(2)
}

await mkdir(out, { recursive: true })
const shots = []
const report = { url, capturedAt: new Date().toISOString(), consoleErrors: [], failedRequests: [], shots, tokens: {}, structure: {} }

const browser = await chromium.launch(process.env.WORDPACK_CHROMIUM === 'playwright' ? {} : { channel: 'chrome' })
try {
  const context = await browser.newContext({ viewport: { width: 1440, height: 950 }, deviceScaleFactor: 1 })
  const page = await context.newPage()
  page.on('console', message => { if (message.type() === 'error') report.consoleErrors.push(message.text().slice(0, 300)) })
  page.on('requestfailed', request => report.failedRequests.push(`${request.url().slice(0, 160)} · ${request.failure()?.errorText}`))

  // 唯一的一次页面加载（networkidle 可能因为长连接永不触发，失败就退回 load）
  await page.goto(url, { waitUntil: 'networkidle', timeout: 60000 })
    .catch(() => page.goto(url, { waitUntil: 'load', timeout: 60000 }))
  await page.waitForTimeout(2500)

  async function shot(name, options = {}) {
    const path = join(out, `${name}.png`)
    await page.screenshot({ path, ...options })
    shots.push({ name, path: path.replace(root + '\\', '').replaceAll('\\', '/'), full: Boolean(options.fullPage) })
  }

  await shot('desktop-1440-full', { fullPage: true })
  await shot('desktop-1440-viewport')

  // 设计令牌：颜色、字体、圆角、阴影、字号
  report.tokens = await page.evaluate(() => {
    const count = (values) => {
      const map = new Map()
      for (const value of values) if (value) map.set(value, (map.get(value) ?? 0) + 1)
      return [...map].sort((a, b) => b[1] - a[1]).slice(0, 40).map(([value, times]) => ({ value, times }))
    }
    const elements = [...document.querySelectorAll('body *')].slice(0, 4000)
    const styles = elements.map(element => getComputedStyle(element))
    const fonts = new Set()
    for (const sheet of document.styleSheets) {
      try {
        for (const rule of sheet.cssRules) {
          if (rule instanceof CSSFontFaceRule) fonts.add(rule.style.getPropertyValue('font-family'))
        }
      } catch { /* 跨域样式表读不到，忽略 */ }
    }
    return {
      colors: count(styles.map(style => style.color)),
      backgrounds: count(styles.map(style => style.backgroundColor).filter(value => value !== 'rgba(0, 0, 0, 0)')),
      fontFamilies: count(styles.map(style => style.fontFamily)),
      fontSizes: count(styles.map(style => style.fontSize)),
      radii: count(styles.map(style => style.borderRadius).filter(value => value !== '0px')),
      shadows: count(styles.map(style => style.boxShadow).filter(value => value !== 'none')),
      declaredFontFaces: [...fonts].filter(Boolean),
      bodyBackground: getComputedStyle(document.body).backgroundColor,
      bodyColor: getComputedStyle(document.body).color,
    }
  })

  report.structure = await page.evaluate(() => {
    const text = (element) => (element?.textContent ?? '').replace(/\s+/g, ' ').trim().slice(0, 80)
    return {
      title: document.title,
      h1: [...document.querySelectorAll('h1')].map(text),
      headings: [...document.querySelectorAll('h1,h2,h3')].slice(0, 30).map(text),
      buttons: [...document.querySelectorAll('button,a[role="button"],a[href]')]
        .map(element => text(element)).filter(Boolean).slice(0, 40),
      sections: [...document.querySelectorAll('section,header,nav,footer,main')]
        .map(element => `${element.tagName.toLowerCase()}${element.id ? '#' + element.id : ''}${element.className ? '.' + String(element.className).split(' ').slice(0, 3).join('.') : ''}`)
        .slice(0, 30),
      viewport: { width: innerWidth, height: innerHeight },
      documentHeight: document.documentElement.scrollHeight,
      textLength: document.body.innerText.length,
      innerTextSample: document.body.innerText.replace(/\s+/g, ' ').slice(0, 1200),
    }
  })

  await writeFile(join(out, 'page.html'), await page.content(), 'utf8')
  await writeFile(join(out, 'page.txt'), await page.evaluate(() => document.body.innerText), 'utf8')

  // 交互：点第一个按钮看看有什么变化
  const button = page.locator('button, a[role="button"], a[href]').first()
  if (await button.count()) {
    try {
      await button.click({ timeout: 5000 })
      await page.waitForTimeout(1800)
      await shot('after-first-click')
    } catch (error) { report.clickError = String(error).slice(0, 200) }
  }

  // 滚到底看完整长页
  await page.evaluate(() => scrollTo({ top: document.body.scrollHeight, behavior: 'instant' }))
  await page.waitForTimeout(1200)
  await shot('desktop-1440-bottom')

  // 同一页切手机视口（不重新加载，省一次 PV）
  await page.setViewportSize({ width: 393, height: 852 })
  await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }))
  await page.waitForTimeout(1200)
  await shot('mobile-393-viewport')
  await shot('mobile-393-full', { fullPage: true })
  report.mobile = await page.evaluate(() => ({
    documentHeight: document.documentElement.scrollHeight,
    horizontalOverflow: document.documentElement.scrollWidth > innerWidth,
    scrollWidth: document.documentElement.scrollWidth,
  }))

  await writeFile(join(out, 'report.json'), JSON.stringify(report, null, 2), 'utf8')
  console.log(`参考站素材已保存到 ${out}`)
  console.log(`截图 ${shots.length} 张 · 颜色 ${report.tokens.colors.length} 种 · 控制台错误 ${report.consoleErrors.length}`)
} finally {
  await browser.close()
}
