"""Generate local wordbook JSON from the MIT ECDICT CSV."""
import csv
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / 'src' / 'data' / 'books'
WORD = re.compile(r"^[A-Za-z][A-Za-z0-9.'’/-]*(?: [A-Za-z0-9.'’/-]+)*$")
PART = re.compile(r'^(n|v|adj|adv|prep|conj|pron|num|art|int|a|vt|vi|ad)\.\s*')
MAP = {'a': 'adj', 'ad': 'adv', 'vt': 'v', 'vi': 'v'}
TAGS = dict(primary='zk', npee='gk', cet4='cet4', cet6='cet6', toefl='toefl', gre='gre')
books = {name: {} for name in (*TAGS, 'primary_school')}
with open(sys.argv[1], encoding='utf-8-sig', newline='') as source:
    for row in csv.DictReader(source):
        tags = set(row['tag'].split())
        head = row['word'].strip().replace('’', "'")
        if not WORD.fullmatch(head) or not row['translation']:
            continue
        frequency = int(row['frq'] or '0')
        available = [name for name, tag in TAGS.items() if tag in tags]
        if 0 < frequency <= 600:
            available.append('primary_school')
        if not available:
            continue
        definitions = []
        for part in row['translation'].replace(r'\n', '\n').splitlines():
            part = part.strip()
            if not part or part.startswith('['):
                continue
            match = PART.match(part)
            pos = MAP.get(match.group(1), match.group(1)) + '.' if match else ''
            gloss = part[match.end():].strip() if match else part
            if gloss:
                definitions.append([pos, gloss])
        if not definitions:
            continue
        ipa = row['phonetic'].strip().strip('/')
        for name in available:
            books[name].setdefault(head.lower(), dict(w=head.lower() if head.isupper() else head,
                p=f'/{ipa}/' if ipa else '', d=definitions[:5], f=frequency))

index = json.loads((ROOT / 'index.json').read_text(encoding='utf-8'))
for book in index:
    entries = list(books[book['id']].values())
    if not entries:
        raise ValueError(f"No source terms for {book['id']}")
    book['totalCount'] = len(entries)
    book['description'] = '按 ECDICT 词书标签收录，含英汉释义与通用音标'
    if book['id'] == 'primary_school':
        book['name'] = '英语基础'
        book['shortName'] = '基础'
        book['description'] = 'ECDICT 常用基础词汇'
    (ROOT / (book['id'] + '.json')).write_text(
        json.dumps(entries, ensure_ascii=False, separators=(',', ':')) + '\n', encoding='utf-8', newline='\n'
    )
(ROOT / 'index.json').write_text(
    json.dumps(index, ensure_ascii=False, indent=2) + '\n', encoding='utf-8', newline='\n'
)
print({name: len(items) for name, items in books.items()})

