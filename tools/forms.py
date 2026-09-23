#!/usr/bin/env python3
# -----------------------------------------------------------------
#  Модальные формы турецкого глагола — один источник правды.
#  Пишет:
#    forms.js              — формы для тренажёра на сайте
#    tools/manifest.tsv    — список фраз для озвучки (gen-audio.sh)
#  Запуск:  python3 tools/forms.py
# -----------------------------------------------------------------
import json, os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
BACK = 'aıou'
VOW = 'aeıioöuü'

def last_vowel(s):
    return [c for c in s if c in VOW][-1]

def A(v):  return 'a' if v in BACK else 'e'
def I4(v): return 'ı' if v in 'aı' else 'i' if v in 'ei' else 'u' if v in 'ou' else 'ü'

# slug, stem, stem-before-vowel, перевод
VERBS = [
    ('gel',   'gel',   'gel',   'приходить'),
    ('yap',   'yap',   'yap',   'делать'),
    ('oku',   'oku',   'okuy',  'читать'),
    ('git',   'git',   'gid',   'идти, ехать'),
    ('konus', 'konuş', 'konuş', 'говорить'),
    ('bekle', 'bekle', 'bekley','ждать'),
    ('ic',    'iç',    'iç',    'пить'),
    ('gor',   'gör',   'gör',   'видеть'),
]
PERS = ['ben', 'sen', 'o', 'biz', 'siz', 'onlar']
GEN  = ['benim', 'senin', 'onun', 'bizim', 'sizin', 'onların']

def forms(stem, stemv):
    v = last_vowel(stem); a = A(v)
    neg = 'm' + a                  # -ma / -me
    i_a = I4(a)
    out = {}
    # 1. могу / можно:  stem(+y) + abil/ebil + ir + лицо
    P1 = ['im', 'sin', '', 'iz', 'siniz', 'ler']
    out['abil'] = [(stemv + a + 'bilir' + p, [stemv, a + 'bil', 'ir', p]) for p in P1]
    # 2. не могу:  stem(+y) + a/e + ma/me + аорист отрицания
    Pneg = [('m', ''), ('z', 's' + i_a + 'n'), ('z', ''), ('y', i_a + 'z'),
            ('z', 's' + i_a + 'n' + i_a + 'z'), ('z', 'l' + a + 'r')]
    res = []
    for (z, p) in Pneg:
        core = a + 'm' + a
        res.append((stemv + core + z + p, [stemv, a, 'm' + a + z, p]))
    out['ama'] = res
    # 3. могу не / может, не:  stem + ma/me + y + a/e + bilir + лицо
    out['mayabil'] = [(stem + neg + 'y' + a + 'bilir' + p, [stem, neg, 'y' + a + 'bil', 'ir', p]) for p in P1]
    # 4. можно? / можешь?:  -abilir + mi + лицо
    Q = ['miyim', 'misin', 'mi', 'miyiz', 'misiniz']
    q = [(stemv + a + 'bilir ' + x, [stemv, a + 'bil', 'ir', ' ' + x]) for x in Q]
    q.append((stemv + a + 'bilirler mi', [stemv, a + 'bil', 'ir', 'ler', ' mi']))
    out['q'] = q
    # 5. должен:  stem + malı/meli + лицо
    li = 'l' + I4(a)
    Pm = ['y' + I4(a) + 'm', 's' + I4(a) + 'n', '', 'y' + I4(a) + 'z', 's' + I4(a) + 'n' + I4(a) + 'z', 'l' + a + 'r']
    out['mali'] = [(stem + 'm' + a + li + p, [stem, 'm' + a + li, p]) for p in Pm]
    # 6. не должен:  stem + ma/me + malı/meli + лицо
    out['mamali'] = [(stem + neg + 'm' + a + li + p, [stem, neg, 'm' + a + li, p]) for p in Pm]
    # 7. надо:  stem + ma/me + принадлежность + lazım
    Pp = ['m', 'n', 's' + I4(a), 'm' + I4(a) + 'z', 'n' + I4(a) + 'z', 'l' + a + 'r' + I4(a)]
    out['lazim'] = [(stem + neg + p + ' lazım', [stem, neg, p, ' lazım']) for p in Pp]
    # 8. вынужден:  stem + mak/mek + zorunda + лицо
    Pz = ['yım', 'sın', '', 'yız', 'sınız', 'lar']
    out['zorunda'] = [(stem + neg + 'k zorunda' + p, [stem, neg + 'k', ' zorunda', p]) for p in Pz]
    return out

data = {'verbs': [], 'pers': PERS, 'gen': GEN}
man = []
def tr(slug, text): man.append(('tr', 'Yelda', slug, text))

for slug, stem, stemv, ru in VERBS:
    f = forms(stem, stemv)
    data['verbs'].append({'slug': slug, 'stem': stem, 'ru': ru,
                          'forms': {m: [{'w': w, 'parts': parts} for w, parts in lst] for m, lst in f.items()}})
    for m, lst in f.items():
        for i, (w, _) in enumerate(lst):
            tr(f'c-{slug}-{m}-{i}', w)

# --- фразы из историй и интерактивов ---
PHRASES = {
    # истории
    's-gelebilirmisin': 'Timur, gelebilir misin?', 's-gelemem': 'Gelemem.', 's-neden': 'Neden?',
    's-bilmiyorum': 'Bilmiyorum.', 's-dinlen': 'Dinlenmelisin. Su içmelisin. Öğlen koşmamalısın.',
    's-nelazim': 'Buyurun, ne lazım?', 's-lazim': 'Lazım.', 's-sarj': 'Bana şarj aleti lazım.',
    's-sigorta': 'Sağlık sigortası?', 's-sonra': 'Sonra getirebilirim.', 's-sart': 'Şart.',
    's-zorunda-kaldim': 'Zorunda kaldım.', 's-emre': 'Emre nerede?', 's-uyuyor-olabilir': 'Uyuyor olabilir.',
    's-uyumus-olmali': 'Uyumuş olmalı.', 's-neoldu': 'Ne oldu?',
    's-bekleyebilir': 'Bekleyebilir misiniz?', 's-pasaport': 'Pasaportunuzu görebilir miyim?',
    # трио
    't-gelebilirim': 'Gelebilirim.', 't-gelemem': 'Gelemem.', 't-gelmeyebilirim': 'Gelmeyebilirim.',
    # шкала обязательности
    'k-0': 'Gidebilirsin.', 'k-1': 'Gitsen iyi olur.', 'k-2': 'Gitmelisin.',
    'k-3': 'Gitmen lazım.', 'k-4': 'Gitmek zorundasın.', 'k-5': 'Gitmen şart.',
    # уверенность
    'e-0': 'Evde olabilir.', 'e-1': 'Evde olmalı.', 'e-2': 'Eve gitmiş olmalı.',
    'e-3': 'Yorgun olmalısın.', 'e-4': 'Olabilir.',
    # разговорные
    'o-olur': 'Olur.', 'o-olmaz': 'Olmaz.', 'o-olurmu': 'Olur mu?', 'o-yapsam': 'Pencereyi açsam olur mu?',
    'o-gerekyok': 'Gerek yok, teşekkürler.', 'o-lazimdegil': 'Lazım değil.',
    # правила
    'r-gitmem-gerek': 'Gitmem gerekiyor.', 'r-pasaport-sart': 'Pasaport şart.',
    'r-girebilir': 'Girebilir miyim?', 'r-yardim': 'Yardım edebilir misiniz?',
    'r-gelmemeli': 'Gelmemelisin.', 'r-yurume': 'Yürümek zorunda kaldım.',
    's-merhaba': 'Merhaba.',
    # правильные ответы теста
    'q-1': 'Bekleyebilir misiniz?', 'q-2': 'Gelemem.', 'q-3': 'Gelmeyebilirim.', 'q-4': 'Dinlenmelisin.',
    'q-5': 'Bana su lazım.', 'q-6': 'Sağlık sigortası şart.', 'q-7': 'Yürümek zorunda kaldım.', 'q-8': 'Uyumuş olmalı.',
}
for k, v in PHRASES.items(): tr(k, v)

# --- «кому что лазым» ---
WHO = [('bana', 'Bana'), ('sana', 'Sana'), ('ona', 'Ona'), ('bize', 'Bize'), ('size', 'Size'), ('onlara', 'Onlara')]
WHAT = [('su', 'su'), ('taksi', 'bir taksi'), ('yardim', 'yardım'), ('sarj', 'şarj aleti'),
        ('zaman', 'biraz zaman'), ('kahve', 'bir kahve')]
for ws, w in WHO:
    for ts, t in WHAT:
        tr(f'l-{ws}-{ts}-lazim', f'{w} {t} lazım.')
        tr(f'l-{ws}-{ts}-gerek', f'{w} {t} gerek.')

with open(os.path.join(ROOT, 'forms.js'), 'w', encoding='utf-8') as f:
    f.write('/* Сгенерировано tools/forms.py — не править руками */\n')
    f.write('window.FORMS=' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
with open(os.path.join(ROOT, 'tools', 'manifest.tsv'), 'w', encoding='utf-8') as f:
    for row in man: f.write('\t'.join(row) + '\n')

if __name__ == '__main__':
    for v in data['verbs']:
        print(v['stem'], '|', ' · '.join(v['forms'][m][0]['w'] for m in v['forms']))
    print('фраз к озвучке:', len(man))
