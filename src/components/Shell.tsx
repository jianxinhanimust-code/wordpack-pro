import type { ReactNode } from 'react'
import { AudioLines, BookOpen, ChartNoAxesColumnIncreasing, ChevronDown, Gem, House, Layers3, PackageOpen, Settings2, Wifi, WifiOff } from 'lucide-react'
import type { BookMeta } from '@/data/books'

export type Page = 'home' | 'pack' | 'study' | 'review' | 'collection' | 'books' | 'stats' | 'settings'
export const paths: Record<Page, string> = {
  home: '学习首页', pack: '拆卡包', study: '学习练习', review: '复习计划',
  collection: '收藏图鉴', books: '我的词书', stats: '学习统计', settings: '偏好设置',
}
const nav = [
  { page: 'home', icon: House },
  { page: 'pack', icon: PackageOpen },
  { page: 'review', icon: AudioLines },
  { page: 'collection', icon: Layers3 },
  { page: 'books', icon: BookOpen },
  { page: 'stats', icon: ChartNoAxesColumnIncreasing },
  { page: 'settings', icon: Settings2 },
] as const

export function Shell({ page, active, go, online, due, children }: {
  page: Page; active: BookMeta; go: (page: Page) => void; online: boolean; due: number; children: ReactNode
}) {
  const date = new Intl.DateTimeFormat('zh-CN', { month: 'long', day: 'numeric', weekday: 'short' }).format(new Date())
  return <div className="shell">
    <aside className="sidebar">
      <button type="button" className="brand" onClick={() => go('home')} aria-label="WordPack Pro 首页">
        <span className="brand-mark"><Gem size={22}/></span>
        <span><strong>WordPack<span> PRO</span></strong><small>拆词记进阶版</small></span>
      </button>
      <nav aria-label="主导航">
        {nav.map(({ page: item, icon: Icon }) => <button type="button" key={item}
          aria-current={(page === item || page === 'study' && item === 'review') ? 'page' : undefined}
          onClick={() => go(item)} className={item === 'settings' ? 'settings-nav' : ''}>
          <Icon size={19}/><span>{paths[item]}</span>
          {item === 'review' && due > 0 && <small>{due}</small>}
        </button>)}
      </nav>
      <div className="sidebar-foot">
        <button className="current-book" onClick={() => go('books')}>
          <BookOpen size={18}/><span><small>当前词书</small><strong>{active.name}</strong></span><ChevronDown size={15}/>
        </button>
        <span className="connect-status">{online ? <Wifi size={14}/> : <WifiOff size={14}/>}
          {online ? '本地自动保存' : '离线学习中'}
        </span>
      </div>
    </aside>
    <div className="main-frame">
      <header className="topbar">
        <div className="crumb"><span>WordPack Pro</span><i>/</i><strong>{paths[page]}</strong></div>
        <button className="mobile-brand" onClick={() => go('home')}><span className="brand-mark"><Gem size={17}/></span> WordPack <b>PRO</b></button>
        <div className="topbar-right"><span>{date}</span><button className="icon-button" aria-label="偏好设置" onClick={() => go('settings')}><Settings2 size={18}/></button></div>
      </header>
      <main id="main">{children}</main>
    </div>
    <nav className="mobile-nav" aria-label="手机导航">
      {nav.filter(n => ['home','pack','review','collection','books'].includes(n.page)).map(({ page: item, icon: Icon }) =>
        <button key={item} aria-current={page === item || page === 'study' && item === 'review' ? 'page' : undefined} onClick={() => go(item)}>
          <Icon size={19}/><span>{item === 'home' ? '首页' : item === 'pack' ? '拆包' : item === 'review' ? '复习' : item === 'collection' ? '图鉴' : '词书'}</span>
        </button>)}
    </nav>
  </div>
}

