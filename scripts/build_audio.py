#!/usr/bin/env python
"""把词头发音生成为站点自带的音频文件，手机端不再依赖系统 TTS。

流程：edge-tts 合成 → ffmpeg 去首尾静音 + 24kHz 单声道 32kbps → 写入 public/audio/
    public/audio/<key 前两位>/<key>.mp3

断点续跑：已存在的文件直接跳过，可以先跑四六级、再补其他词书。

用法：
    python scripts/build_audio.py                 # 全部词书
    python scripts/build_audio.py --books cet6 cet4
    python scripts/build_audio.py --limit 50      # 只跑前 50 个（试跑）
"""
import argparse
import asyncio
import json
import os
import subprocess
import sys
import time

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BOOKS = os.path.join(ROOT, 'src', 'data', 'books')
OUT = os.path.join(ROOT, 'public', 'audio')
TMP = os.path.join(ROOT, '.audio-tmp')
VOICE = 'en-US-AriaNeural'
# 词书优先级：四六级在前，其它依次
ORDER = ['cet6', 'cet4', 'npee', 'primary', 'primary_school', 'toefl', 'gre']


def audio_key(word: str) -> str:
    """与 src/core/audio.ts 的 audioKey 保持一致：小写，非字母数字压成下划线。"""
    text = word.strip().lower().replace('\u2019', "'")
    out = []
    for char in text:
        out.append(char if char.isascii() and (char.isalnum() or char == "'") else '_')
    key = ''.join(out)
    while '__' in key:
        key = key.replace('__', '_')
    return key.strip('_')


def collect(books):
    words, seen = [], set()
    for book in books:
        path = os.path.join(BOOKS, f'{book}.json')
        if not os.path.exists(path):
            print(f'跳过不存在的词书 {book}', file=sys.stderr)
            continue
        with open(path, encoding='utf-8') as handle:
            for entry in json.load(handle):
                word = entry['w'].strip()
                key = audio_key(word)
                if not key or key in seen:
                    continue
                seen.add(key)
                words.append((word, key))
    return words


async def synth(word: str, key: str, sem: asyncio.Semaphore, counters: dict):
    import edge_tts
    target = os.path.join(OUT, key[:2], f'{key}.mp3')
    if os.path.exists(target) and os.path.getsize(target) > 500:
        counters['skip'] += 1
        return
    os.makedirs(os.path.dirname(target), exist_ok=True)
    raw = os.path.join(TMP, f'{key}.mp3')
    async with sem:
        try:
            await edge_tts.Communicate(word, VOICE).save(raw)
        except Exception as error:  # 网络抖动就把这个词留到下一轮
            counters['fail'] += 1
            counters['last'] = f'{word}: {error}'
            return
        process = await asyncio.create_subprocess_exec(
            'ffmpeg', '-hide_banner', '-loglevel', 'error', '-nostdin', '-y', '-i', raw,
            '-af', 'silenceremove=start_periods=1:start_duration=0:start_threshold=-50dB:'
                   'stop_periods=-1:stop_duration=0.05:stop_threshold=-50dB',
            '-ac', '1', '-ar', '24000', '-b:a', '32k', target,
            stdin=asyncio.subprocess.DEVNULL,
            stdout=asyncio.subprocess.DEVNULL, stderr=asyncio.subprocess.PIPE)
        try:
            _, err = await asyncio.wait_for(process.communicate(), timeout=30)
        except asyncio.TimeoutError:
            process.kill()
            await process.wait()
            err = b'timeout'
        if process.returncode != 0:
            counters['fail'] += 1
            counters['last'] = f'{word}: {err.decode()[:120]}'
        else:
            counters['done'] += 1
    if os.path.exists(raw):
        os.remove(raw)


async def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--books', nargs='*', default=ORDER)
    parser.add_argument('--limit', type=int, default=0)
    parser.add_argument('--jobs', type=int, default=8)
    args = parser.parse_args()

    os.makedirs(OUT, exist_ok=True)
    os.makedirs(TMP, exist_ok=True)
    words = collect(args.books)
    if args.limit:
        words = words[:args.limit]
    print(f'待处理 {len(words)} 个词头，并发 {args.jobs}，语音 {VOICE}', flush=True)

    sem = asyncio.Semaphore(args.jobs)
    counters = {'done': 0, 'skip': 0, 'fail': 0, 'last': ''}
    start = time.time()
    tasks = []
    for index, (word, key) in enumerate(words):
        tasks.append(asyncio.create_task(synth(word, key, sem, counters)))
        if len(tasks) >= 200:
            await asyncio.gather(*tasks)
            tasks = []
            elapsed = time.time() - start
            print(f'  {index + 1}/{len(words)} · 新增 {counters["done"]} · 跳过 {counters["skip"]} '
                  f'· 失败 {counters["fail"]} · {elapsed:.0f}s', flush=True)
    await asyncio.gather(*tasks)

    files = sum(len(names) for _, _, names in os.walk(OUT))
    size = sum(os.path.getsize(os.path.join(root, name))
               for root, _, names in os.walk(OUT) for name in names)
    print(f'完成：新增 {counters["done"]}，跳过 {counters["skip"]}，失败 {counters["fail"]}，'
          f'共 {files} 个文件 / {size / 1024 / 1024:.1f} MB', flush=True)
    if counters['last']:
        print(f'最后一个错误：{counters["last"]}', file=sys.stderr)


if __name__ == '__main__':
    asyncio.run(main())
