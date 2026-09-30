#!/usr/bin/env python3
"""Builds index.html from the Sefaria export of Siddur Edot HaMizrach."""
import json, re, html, pathlib

ROOT = pathlib.Path(__file__).parent
SRC = ROOT / 'siddur-source.json'
T = json.load(open(SRC))['text']
SH, MI, AR = 'Weekday Shacharit', 'Weekday Mincha', 'Weekday Arvit'
RC, FE, OM = 'Rosh Hodesh', 'Prayers for Three Festivals', 'Counting of the Omer'

NIK = 'ְ-ׇֽֿׁׂׅׄ'

def seg(path, n):
    node = T[path[0]] if len(path) == 1 else T[path[0]][path[1]]
    return node[n - 1]

def clean(s):
    s = re.sub('[֑-֯]', '', s)
    s = s.replace('׀', '').replace('|', '')
    s = s.replace('‍', '').replace('‏', '').replace(' ', ' ').replace('\t', ' ').replace(' ', ' ')
    s = s.replace('שׁ', 'שׁ')
    m = f'[{NIK}]*'
    # kabbalistic spellings of the Name -> standard
    s = re.sub(f'(?<![א-ת{NIK}])י{m}ו{m}ה{m}ו{m}ו{m}ו{m}ה{m}ו{m}(?![א-ת])', 'יְהֹוָה', s)
    s = re.sub(f'(?<![א-ת{NIK}])י{m}ה{m}ו{m}ה{m}(?![א-ת])', 'יְהֹוָה', s)
    s = re.sub(r'<br\s*/?>', '<br>', s, flags=re.I)
    # source references
    s = re.sub(r'<small>\s*\([^()<]*\)\s*</small>', '', s)
    s = re.sub(r'\((?:תהלים|תהילים|דברים|במדבר|שמות|דניאל|בא"ח)[^()]*\)', '', s)
    return s

def loose(phrase):
    """regex for a plain phrase that tolerates nikud and maqaf/space variations"""
    out = []
    for ch in phrase:
        if ch == ' ':
            out.append(r'[\s־]+')
        else:
            out.append(re.escape(ch) + f'[{NIK}]*')
    return ''.join(out)

LABELS = [
    ('בעשרת ימי תשובה', 'ayt'), ('בחנוכה ופורים', 'nissim'), ('בחנוכה', 'chanukah'), ('בפורים', 'purim'),
    ('בראש חדש', 'rc'), ('בחוה"מ פסח', 'chpesach'), ('בחוה"מ סוכות', 'chsukkot'), ('בשנה מעוברת', 'leap'),
    ('בשבת', 'never'), ('ביו"ט', 'never'),
]
SHORT = {'ayt': 'עשרת ימי תשובה', 'nissim': 'חנוכה ופורים', 'chanukah': 'חנוכה', 'purim': 'פורים', 'rc': 'ראש חודש',
         'chpesach': 'חול המועד פסח', 'chsukkot': 'חול המועד סוכות', 'leap': 'שנה מעוברת', 'tal': 'קיץ', 'geshem': 'חורף',
         '!ayt': 'בשאר השנה'}

SHORT.update({'aneinu': 'יום צום', 'nachem': 'תשעה באב', '!nachem': 'בשאר הימים', 'motzash': 'מוצאי שבת', 'chanukah': 'חנוכה', 'purim': 'פורים', 'nissim': 'חנוכה ופורים'})
def strip_nik(s):
    return re.sub(f'[{NIK}]', '', s)

# ---- tiny tag tree parser ----
def parse(s):
    root = []; stack = [root]; tags = []
    for tok in re.split(r'(<[^>]+>)', s):
        if not tok:
            continue
        m = re.match(r'<(/?)([a-zA-Z][\w-]*)([^>]*)>', tok)
        if not m:
            stack[-1].append(tok); continue
        close, name, attrs = m.group(1), m.group(2).lower(), m.group(3)
        if name == 'br':
            stack[-1].append(('br', [])); continue
        if not close:
            node = (name, [], attrs); stack[-1].append(node); stack.append(node[1]); tags.append(name)
        else:
            if name in tags:
                while tags:
                    t = tags.pop(); stack.pop()
                    if t == name: break
    return root

def text_of(nodes):
    out = []
    for n in nodes:
        if isinstance(n, str): out.append(n)
        elif n[0] != 'br': out.append(text_of(n[1]))
    return ''.join(out)

def render(nodes, depth=0, mode='default'):
    out = []
    for n in nodes:
        if isinstance(n, str):
            out.append(html.escape(n, quote=False)); continue
        name, kids = n[0], n[1]
        if name == 'br':
            out.append(' '); continue
        if name == 'x-w':
            attrs = n[2]
            out.append(f'<span class="alt"{attrs}>' + render(kids, depth, mode) + '</span>'); continue
        if name == 'small':
            # labelled conditional: <small><small>LABEL</small> CONTENT</small>
            if kids and not isinstance(kids[0], str) and kids[0][0] == 'small':
                lab = strip_nik(text_of(kids[0][1])).strip()
                flag = next((f for l, f in LABELS if lab.startswith(l)), None)
                if flag == 'never':
                    continue
                if flag:
                    out.append(f'<span class="alt" data-when="{flag}" data-label="{SHORT[flag]}">' + render(kids[1:], depth + 1, 'text').strip() + '</span>')
                    continue
            raw_txt = text_of(kids)
            if not strip_nik(raw_txt).strip():
                continue
            vowelized = bool(re.search(f'[{NIK}]', raw_txt))
            if not vowelized:
                out.append('<span class="note">' + render(kids, depth + 1, 'text') + '</span>')
            elif mode == 'text' or depth >= 1:
                out.append(render(kids, depth + 1, 'text'))
            else:
                out.append('<span class="opt">' + render(kids, depth + 1, 'text') + '</span>')
            continue
        if name == 'b':
            out.append('<b>' + render(kids, depth, mode) + '</b>'); continue
        out.append(render(kids, depth, mode))  # big, i, span...
    return ''.join(out)

def build_seg(path, n, opts):
    s = clean(seg(path, n))
    if opts.get('cut_br2'):
        s = s.split('<br><br>')[0]
    for a, b in opts.get('replace', []):
        s = re.sub(a, b, s)
    if opts.get('strip_label'):
        s = re.sub(r'^\s*<small>[^<]*</small>\s*', '', s)
    if opts.get('talgeshem'):
        m = re.match(r'(.*?)<small>בקיץ:</small>(.*?)<small>בחורף:</small>(.*)$', s, re.S)
        s = (m.group(1) + f'<x-w data-when="tal" data-label="קיץ">{m.group(2).strip()}</x-w> '
             f'<x-w data-when="geshem" data-label="חורף">{m.group(3).strip()}</x-w>')
    for phrase, when in opts.get('wrap', []):
        s = re.sub('(' + loose(phrase) + ')', f'<x-w data-when="{when}" data-label="{SHORT.get(when, "")}">\\1</x-w>', s, count=1)
    body = render(parse(s), 0, opts.get('mode', 'default'))
    body = re.sub(r'\s+', ' ', body).strip()
    return body

def rng(spec):
    out = []
    for part in str(spec).split(','):
        if '-' in part:
            a, b = part.split('-'); out += list(range(int(a), int(b) + 1))
        else:
            out.append(int(part))
    return out

ICON = {
    'info': '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 8v5M12 16h.01"/></svg>',
}

def blk(path, nums, lv=1, when='', **opts):
    return ('seg', path, nums, lv, when, opts)
def jblk(path, pieces, lv=1, when='', **opts):
    # pieces: list of n or (n, subwhen, subopts)
    norm = []
    for x in pieces:
        if isinstance(x, int): norm.append((x, '', {}))
        elif len(x) == 2: norm.append((x[0], x[1], {}))
        else: norm.append(x)
    return ('join', path, norm, lv, when, opts)
def cue(text, lv=1, when=''):
    return ('cue', text, lv, when)
def part(pid, title, lv=1, when='', items=()):
    return (pid, title, lv, when, list(items))

WRAP_KADOSH = [('האל הקדוש:', '!ayt')]
WRAP_MISHPAT = [('מלך אוהב צדקה ומשפט:', '!ayt')]
WRAP_SHALOM = [('שלום', '!ayt')]
HALLEL = [
    cue('בראש חודש ובחול המועד פסח אומרים הלל בדילוג וללא ברכה. בחול המועד סוכות ובחנוכה גומרים את ההלל ומברכים.', 1),
    blk([RC, 'Hallel'], '5', 1, 'hallelFull', mode='text'),
    blk([RC, 'Hallel'], '6-7'),
    blk([RC, 'Hallel'], '9', 1, 'hallelFull', mode='text'),
    blk([RC, 'Hallel'], '10'),
    blk([RC, 'Hallel'], '12', 1, 'hallelFull', mode='text'),
    blk([RC, 'Hallel'], '13-19'),
    blk([RC, 'Hallel'], '20', mode='text'),
    blk([RC, 'Hallel'], '21-22'),
    blk([RC, 'Hallel'], '23', mode='text'),
    blk([RC, 'Hallel'], '25', 1, 'hallelFull', mode='text'),
]
MUSAF_RC = [
    blk([RC, 'Mussaf'], '3-4'), jblk([RC, 'Mussaf'], [5, (6, '', {'talgeshem': True}), 7]),
    blk([RC, 'Mussaf'], '9-16'),
    jblk([RC, 'Mussaf'], [19, 20], 1, 'chanukah', mode='text'),
    blk([RC, 'Mussaf'], '21'), blk([RC, 'Mussaf'], '35-40'), blk([RC, 'Mussaf'], '41', mode='text'),
]
MUSAF_FE = [
    blk([FE, 'Mussaf'], '2-3'), jblk([FE, 'Mussaf'], [4, (5, '', {'talgeshem': True}), 6]),
    blk([FE, 'Mussaf'], '11'),
    jblk([FE, 'Mussaf'], [12, 13, (15, 'chpesach', {'strip_label': True}), (17, 'chsukkot', {'strip_label': True}), 19]),
    blk([FE, 'Mussaf'], '20'),
    jblk([FE, 'Mussaf'], [21, 22, (23, 'chpesach', {'strip_label': True}), (25, 'chsukkot', {'strip_label': True}), 27]),
    blk([FE, 'Mussaf'], '28-29'), blk([FE, 'Mussaf'], '32-35'), blk([FE, 'Mussaf'], '37'),
    blk([FE, 'Mussaf'], '51-56'), blk([FE, 'Mussaf'], '57', mode='text'),
]

SHACHARIT = [
    part('sh-tefillin', 'תפילין', 1, 'tefillin', [
        cue('מניחים של יד ומברכים לפני ההידוק, ומיד מניחים של ראש בלי ברכה נוספת. לא מדברים ביניהם.'),
        blk([SH, 'Order of Tefillin'], '3', cut_br2=True),
        blk([SH, 'Order of Tefillin'], '4'),
        blk([SH, 'Order of Tefillin'], '5-6', 3),
    ]),
    part('sh-hodu', 'הודו', 3, '', [
        blk([SH, 'Hodu'], '2-6', 3),
        blk([SH, 'Hodu'], '7-8', 3, 'aytOrHr'),
        blk([SH, 'Hodu'], '9-12', 3),
        blk([SH, 'Hodu'], '14-15', 3),
    ]),
    part('sh-pdz', 'פסוקי דזמרה', 2, '', [
        blk([SH, "Pesukei D'Zimra"], '2', 2),
        blk([SH, "Pesukei D'Zimra"], '3-5', 3),
        blk([SH, "Pesukei D'Zimra"], '6-7', 2),
        blk([SH, "Pesukei D'Zimra"], '8-18', 3),
        blk([SH, "Pesukei D'Zimra"], '19', 2),
        blk([SH, "Pesukei D'Zimra"], '20-21', 3, 'ayt', mode='text'),
    ]),
    part('sh-shema', 'קריאת שמע', 1, '', [
        cue('מכאן ועד סוף העמידה לא מפסיקים בדיבור.'),
        blk([SH, 'The Shema'], '2-11'),
        blk([SH, 'The Shema'], '12', mode='text'),
        blk([SH, 'The Shema'], '13-15'),
        blk([SH, 'The Shema'], '16', replace=[(r'<small>[^<]*</small>', '<small>ביחיד חוזר:</small>')]),
        blk([SH, 'The Shema'], '17-21'),
        cue('סמיכת גאולה לתפילה: עוברים מיד לעמידה, בלי שום הפסק ובלי לענות אמן.'),
    ]),
    part('sh-amida', 'עמידה', 1, '', [
        cue('פוסעים שלוש פסיעות קדימה, עומדים ברגליים צמודות ומתפללים בלחש.'),
        blk([SH, 'Amida'], '2-3'), jblk([SH, 'Amida'], [4, (5, '', {'talgeshem': True}), 6]),
        blk([SH, 'Amida'], '10', wrap=WRAP_KADOSH), blk([SH, 'Amida'], '11-14'), blk([SH, 'Amida'], '18'),
        blk([SH, 'Amida'], '20', 1, 'summer9'), blk([SH, 'Amida'], '22', 1, 'winter9'),
        blk([SH, 'Amida'], '23'), blk([SH, 'Amida'], '24', wrap=WRAP_MISHPAT), blk([SH, 'Amida'], '25-28'),
        jblk([SH, 'Amida'], [29, (30, 'aneinu', {'mode': 'text'}), 32]),
        blk([SH, 'Amida'], '33'),
        jblk([SH, 'Amida'], [35, 36, 37, 38, 39], 1, 'rc|ch', mode='text'),
        blk([SH, 'Amida'], '40-42'),
        jblk([SH, 'Amida'], [47, (48, 'chanukah'), (49, 'purim')], 1, 'nissim', mode='text'),
        blk([SH, 'Amida'], '50'), blk([SH, 'Amida'], '66-69'), blk([SH, 'Amida'], '70', cut_br2=True),
        cue('פוסעים שלוש פסיעות לאחור. פונים שמאלה ב"עושה שלום במרומיו", ימינה ב"הוא ברחמיו יעשה שלום עלינו", וקדימה ב"ועל כל עמו ישראל".'),
        blk([SH, 'Amida'], '71', wrap=WRAP_SHALOM), blk([SH, 'Amida'], '72', mode='text'),
        blk([SH, 'Amida'], '75-106', 2, 'ayt', mode='text'),
    ]),
    part('sh-hallel', 'הלל', 1, 'hallel', HALLEL),
    part('sh-tachanun', 'תחנון', 3, 'tachanun', [
        blk([SH, 'Vidui'], '2-10', 3),
        blk([SH, 'Vidui'], '14-33', 3, 'monthu'),
    ]),
    part('sh-ashrei', 'אשרי ובא לציון', 3, '', [
        blk([SH, 'Ashrei'], '2-4', 3), blk([SH, 'Ashrei'], '6', 3, 'lamnatzeach'),
        blk([SH, 'Uva LeSion'], '2-3', 3),
    ]),
    part('sh-musaf', 'מוסף', 1, 'musaf', [
        cue('מוסף: שוב פוסעים שלוש פסיעות קדימה ומתפללים בלחש, כמו בשמונה עשרה.'),
        *[b[:4] + ('musafRC' if not b[4] else 'musafRC&' + b[4],) + b[5:] if b[0] in ('seg', 'join') else b for b in MUSAF_RC],
        *[b[:4] + ('musafFest' if not b[4] else 'musafFest&' + b[4],) + b[5:] if b[0] in ('seg', 'join') else b for b in MUSAF_FE],
    ]),
    part('sh-end', 'סיום', 2, '', [
        blk([SH, 'Beit Yaakov'], '3', 3, 'tachanun'), blk([SH, 'Beit Yaakov'], '4-5', 3),
        blk([SH, 'Song of the Day'], '3-4', 3, 'dow0'), blk([SH, 'Song of the Day'], '5-6', 3, 'dow1'),
        blk([SH, 'Song of the Day'], '7-8', 3, 'dow2'), blk([SH, 'Song of the Day'], '9-10', 3, 'dow3'),
        blk([SH, 'Song of the Day'], '11-12', 3, 'dow4'), blk([SH, 'Song of the Day'], '13-14', 3, 'dow5'),
        blk([SH, 'Song of the Day'], '15-16', 3, 'song83', mode='text'), blk([SH, 'Song of the Day'], '17-18', 3, 'song85', mode='text'),
        blk([SH, 'Song of the Day'], '19-20', 3, 'song30', mode='text'), blk([SH, 'Song of the Day'], '21-22', 3, 'song22', mode='text'),
        blk([SH, 'Song of the Day'], '23-24', 3, 'song79', mode='text'),
        blk([SH, 'Kaveh'], '2-3', 3), blk([SH, 'Kaveh'], '5-12', 3),
        blk([SH, 'Alenu'], '2-3', 2), blk([SH, 'Alenu'], '4', 3, mode='text'), blk([SH, 'Alenu'], '5-6', 3),
    ]),
]

MINCHA = [
    part('mi-korbanot', 'קרבנות', 3, '', [
        blk([MI, 'Offerings'], '3-11', 3),
    ]),
    part('mi-ashrei', 'אשרי', 2, '', [
        blk([MI, 'Offerings'], '12-13', 2), blk([MI, 'Offerings'], '14', 3),
    ]),
    part('mi-amida', 'עמידה', 1, '', [
        cue('פוסעים שלוש פסיעות קדימה, עומדים ברגליים צמודות ומתפללים בלחש.'),
        blk([MI, 'Amida'], '2-3'), jblk([MI, 'Amida'], [4, (5, '', {'talgeshem': True}), 6]),
        blk([MI, 'Amida'], '9', wrap=WRAP_KADOSH), blk([MI, 'Amida'], '10-13'), blk([MI, 'Amida'], '17'),
        blk([MI, 'Amida'], '19', 1, 'summer9'), blk([MI, 'Amida'], '21', 1, 'winter9'),
        blk([MI, 'Amida'], '22'), blk([MI, 'Amida'], '23', wrap=WRAP_MISHPAT), blk([MI, 'Amida'], '24-25'),
        jblk([MI, 'Amida'], [26, (27, 'nachem', {'mode': 'text', 'replace': [(r'<b>בתשעה באב</b>\s*אומרים:\s*', '')]}), (28, 'nachem', {'mode': 'text', 'replace': [(r'<br>\s*<small>[^<]*</small>', '')]}), (29, '!nachem')]),
        blk([MI, 'Amida'], '30'),
        jblk([MI, 'Amida'], [31, (32, 'aneinu', {'mode': 'text'}), 34]),
        blk([MI, 'Amida'], '35'),
        jblk([MI, 'Amida'], [37, 38, 39, 40, 41], 1, 'rc|ch', mode='text'),
        blk([MI, 'Amida'], '42-44'),
        jblk([MI, 'Amida'], [47, (48, 'chanukah'), (49, 'purim')], 1, 'nissim', mode='text'),
        blk([MI, 'Amida'], '50'), blk([MI, 'Amida'], '64-67'), blk([MI, 'Amida'], '68', cut_br2=True),
        cue('פוסעים שלוש פסיעות לאחור. פונים שמאלה ב"עושה שלום במרומיו", ימינה ב"הוא ברחמיו יעשה שלום עלינו", וקדימה ב"ועל כל עמו ישראל".'),
        blk([MI, 'Amida'], '71', wrap=WRAP_SHALOM), blk([MI, 'Amida'], '72', mode='text'),
        blk([MI, 'Amida'], '74-105', 2, 'ayt', mode='text'),
    ]),
    part('mi-tachanun', 'תחנון', 3, 'tachanun', [
        blk([MI, 'Vidui'], '2-10', 3),
    ]),
    part('mi-end', 'סיום', 2, '', [
        blk([MI, 'Vidui'], '17', 3, '!friday'), blk([MI, 'Vidui'], '19', 3, 'friday', mode='text'),
        blk([MI, 'Alenu'], '2-3', 2), blk([MI, 'Alenu'], '4', 3, mode='text'),
    ]),
]

ARVIT = [
    part('ar-open', 'פתיחה', 2, '', [
        blk([AR, 'Barchu'], '5', 3), blk([AR, 'Barchu'], '8', 2),
    ]),
    part('ar-shema', 'קריאת שמע', 1, '', [
        blk([AR, 'The Shema'], '2-5'), blk([AR, 'The Shema'], '6', mode='text'), blk([AR, 'The Shema'], '7-9'),
        blk([SH, 'The Shema'], '16', replace=[(r'<small>[^<]*</small>', '<small>ביחיד חוזר:</small>')]),
        blk([AR, 'The Shema'], '10-11'),
    ]),
    part('ar-amida', 'עמידה', 1, '', [
        cue('פוסעים שלוש פסיעות קדימה, עומדים ברגליים צמודות ומתפללים בלחש.'),
        blk([AR, 'Amidah'], '2-3'), jblk([AR, 'Amidah'], [4, (5, '', {'talgeshem': True}), 6]),
        blk([AR, 'Amidah'], '7', wrap=WRAP_KADOSH),
        jblk([AR, 'Amidah'], [8, (10, 'motzash', {'mode': 'text'}), 11]),
        blk([AR, 'Amidah'], '12-15'),
        blk([AR, 'Amidah'], '17', 1, 'summer9'), blk([AR, 'Amidah'], '19', 1, 'winter9'),
        blk([AR, 'Amidah'], '20'), blk([AR, 'Amidah'], '21', wrap=WRAP_MISHPAT), blk([AR, 'Amidah'], '22-25'),
        jblk([AR, 'Amidah'], [26, (27, 'aneinu', {'mode': 'text'}), 29]),
        blk([AR, 'Amidah'], '30'),
        jblk([AR, 'Amidah'], [32, 33, 34, 35, 36], 1, 'rc|ch', mode='text'),
        blk([AR, 'Amidah'], '37-39'),
        jblk([AR, 'Amidah'], [41, (42, 'chanukah'), (43, 'purim')], 1, 'nissim', mode='text'),
        blk([AR, 'Amidah'], '44-48'), blk([AR, 'Amidah'], '49', cut_br2=True),
        cue('פוסעים שלוש פסיעות לאחור. פונים שמאלה ב"עושה שלום במרומיו", ימינה ב"הוא ברחמיו יעשה שלום עלינו", וקדימה ב"ועל כל עמו ישראל".'),
        blk([AR, 'Amidah'], '50', wrap=WRAP_SHALOM), blk([AR, 'Amidah'], '51', mode='text'),
    ]),
    part('ar-omer', 'ספירת העומר', 1, 'omerOn', [
        cue('סופרים בעמידה, אחרי צאת הכוכבים.'),
        blk([OM], '4'),
        *[blk([OM], str(6 + 3 * (i - 1)), 1, f'omer{i}') for i in range(1, 50)],
        blk([OM], '152'),
        blk([OM], '153-160', 3), blk([OM], '161', 3),
    ]),
    part('ar-motzash', 'מוצאי שבת', 3, 'motzash', [
        blk([AR, 'Amidah'], '58-61', 3, mode='text'),
    ]),
    part('ar-end', 'סיום', 2, '', [
        blk([AR, 'Amidah'], '67', 3),
        blk([AR, 'Alenu'], '2-3', 2), blk([AR, 'Alenu'], '4', 3, mode='text'),
    ]),
]

CUE_ICON = '<svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3l9 16H3z"/><path d="M12 10v4M12 17h.01"/></svg>'

def attrs(lv, when):
    a = f' data-lv="{lv}"'
    if when:
        a += f' data-when="{when}"'
    return a

def render_prayer(key, parts):
    out = [f'<div class="prayer" id="p-{key}" data-prayer="{key}">']
    for pid, title, lv, when, items in parts:
        out.append(f'<section class="part" id="{pid}"{attrs(lv, when)} data-title="{title}">')
        out.append(f'<h2 class="part-h">{title}</h2>')
        for it in items:
            if it[0] == 'cue':
                _, text, clv, cwhen = it
                out.append(f'<p class="cue"{attrs(clv, cwhen)}>{CUE_ICON}<span>{html.escape(text)}</span></p>')
            elif it[0] == 'join':
                _, path, pieces, blv, bwhen, opts = it
                chunks = []
                for n, sw, so in pieces:
                    o = dict(opts); o.update(so)
                    body = build_seg(path, n, o)
                    if not strip_nik(re.sub('<[^>]+>', '', body)).strip():
                        continue
                    if sw:
                        body = f'<span class="alt" data-when="{sw}" data-label="{SHORT.get(sw, sw)}">{body}</span>'
                    chunks.append(body)
                out.append(f'<p class="t"{attrs(max(blv, lv), bwhen)}>' + ' '.join(chunks) + '</p>')
            else:
                _, path, nums, blv, bwhen, opts = it
                for n in rng(nums):
                    body = build_seg(path, n, opts)
                    if not strip_nik(re.sub('<[^>]+>', '', body)).strip():
                        continue
                    cls = 't'
                    plain = re.sub('<[^>]+>', '', body)
                    if body.startswith('<span class="note">') and body.endswith('</span>') and body.count('<span class="note">') == 1 and not re.search(f'[{NIK}]', plain):
                        cls = 't only-note'
                    out.append(f'<p class="{cls}"{attrs(max(blv, lv), bwhen)}>{body}</p>')
        out.append('</section>')
    out.append('</div>')
    return '\n'.join(out)

prayers = '\n'.join([render_prayer('shacharit', SHACHARIT), render_prayer('mincha', MINCHA), render_prayer('arvit', ARVIT)])
tpl = (ROOT / 'template.html').read_text(encoding='utf-8')
engine = (ROOT / 'engine.js').read_text(encoding='utf-8')
out = tpl.replace('{{PRAYERS}}', prayers).replace('/*{{ENGINE}}*/', engine)
(ROOT.parent / 'index.html').write_text(out, encoding='utf-8')
print('ok', len(out))
