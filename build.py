#!/usr/bin/env python3
"""
Build the two language editions from one source.

src/index.html carries every string twice (data-en / data-ar). This resolves
those into two real pages so each has its own URL, its own <html lang>, its own
canonical, and Arabic text in the HTML that arrives rather than in attributes a
crawler has to execute JavaScript to reach.

    python3 build.py      ->  ./index.html   and  ./ar/index.html

Edit src/index.html. Never edit the two outputs; they are overwritten.
"""
import io, os, re, json, sys
from bs4 import BeautifulSoup

ROOT = os.path.dirname(os.path.abspath(__file__))
SRC  = os.path.join(ROOT, 'src', 'index.html')
SITE = 'https://ahmadhaider.com'

META = {
 'en': dict(
   lang='en', dir='ltr', path='/', out='index.html',
   locale='en_US', alt_locale='ar_KW',
   title='Ahmad Haider — Sculptor | أحمد حيدر نحات الكويت',
   og_title='Ahmad Haider — Sculptor | أحمد حيدر نحات',
   desc='Ahmad Haider (أحمد حيدر) — sculptor in Kuwait. Commissioned portrait '
        'busts, reliefs and figures, cast in bronze, ceramic or plaster. '
        'نحات كويتي: بورتريه، نحت بارز، تماثيل برونزية.',
   og_desc='Sculptor in Kuwait. Commissioned portrait busts, reliefs and '
           'figures, cast in bronze, ceramic or plaster.',
   toggle_href='/ar/', toggle_label='AR',
   toggle_aria='عرض الصفحة بالعربية', toggle_lang='ar',
   page_name='Ahmad Haider — Sculptor'),
 'ar': dict(
   lang='ar', dir='rtl', path='/ar/', out=os.path.join('ar','index.html'),
   locale='ar_KW', alt_locale='en_US',
   title='أحمد حيدر — نحّات كويتي | Ahmad Haider, Sculptor',
   og_title='أحمد حيدر — نحّات كويتي',
   desc='أحمد حيدر، نحّات مقيم في الكويت. تماثيل نصفية وبورتريه ونحت بارز '
        'ونسخ محدودة، تُصبّ بالبرونز أو السيراميك أو الجبس.',
   og_desc='نحّات مقيم في الكويت. تماثيل نصفية وبورتريه ونحت بارز، تُصبّ '
           'بالبرونز أو السيراميك أو الجبس.',
   toggle_href='/', toggle_label='EN',
   toggle_aria='View this page in English', toggle_lang='en',
   page_name='أحمد حيدر — نحّات'),
}

BANNER = ("<!-- GENERATED FILE - do not edit.\n"
          "     Source: src/index.html   Build: python3 build.py\n"
          "     Edits made here are lost on the next build. -->\n")

# anyone still holding the old ?lang=ar bookmark lands on the Arabic page
LEGACY = ("<script>if(location.search.indexOf('lang=ar')>-1)"
          "location.replace('/ar/');</script>\n")

NASKH = ("@font-face{font-family:'Noto Naskh Arabic';font-style:normal;"
         "font-weight:400 700;font-display:swap;"
         "src:url('/fonts/naskh-arabic.woff2') format('woff2')}\n")


def strip_i18n_attrs(soup):
    for el in soup.find_all(True):
        for a in [k for k in el.attrs if k.startswith('data-en') or k.startswith('data-ar')]:
            del el[a]


def resolve(soup, lang):
    """data-<lang>* wins over whatever is currently in the document."""
    for el in soup.select('[data-en]'):
        v = el.get('data-%s' % lang)
        if v is not None:
            el.string = v
    for el in soup.select('[data-en-html]'):
        v = el.get('data-%s-html' % lang)
        if v is not None:
            el.clear()
            el.append(BeautifulSoup(v, 'html.parser'))
    for el in soup.select('[data-en-href]'):
        v = el.get('data-%s-href' % lang)
        if v is not None:
            el['href'] = v
    for el in soup.select('[data-en-alt]'):
        v = el.get('data-%s-alt' % lang)
        if v is not None:
            el['alt'] = v
    strip_i18n_attrs(soup)


def set_meta(soup, m):
    soup.html['lang'] = m['lang']
    soup.html['dir']  = m['dir']
    soup.title.string = m['title']

    def meta(attr, key, val):
        t = soup.find('meta', {attr: key})
        if t: t['content'] = val
        return t
    meta('name', 'description', m['desc'])
    meta('property', 'og:title', m['og_title'])
    meta('property', 'og:description', m['og_desc'])
    meta('property', 'og:url', SITE + m['path'])
    meta('property', 'og:locale', m['locale'])
    meta('property', 'og:locale:alternate', m['alt_locale'])

    # each page canonicals to ITSELF; hreflang is reciprocal or Google drops it
    soup.find('link', rel='canonical')['href'] = SITE + m['path']
    for l in soup.find_all('link', rel='alternate'):
        l.decompose()
    can = soup.find('link', rel='canonical')
    for hl, href in (('en', SITE + '/'), ('ar', SITE + '/ar/'), ('x-default', SITE + '/')):
        tag = soup.new_tag('link', rel='alternate', href=href)
        tag['hreflang'] = hl
        can.insert_after(tag)


def set_toggle(soup, m):
    btn = soup.find(id='lang')
    a = soup.new_tag('a', href=m['toggle_href'])
    a['class'] = 'pill'; a['id'] = 'lang'
    a['hreflang'] = m['toggle_lang']; a['lang'] = m['toggle_lang']
    a['aria-label'] = m['toggle_aria']
    span = soup.new_tag('span'); span['id'] = 'langLabel'
    span['dir'] = 'ltr'; span.string = m['toggle_label']
    a.append(span)
    btn.replace_with(a)


def set_jsonld(soup, m):
    tag = soup.find('script', type='application/ld+json')
    d = json.loads(tag.string)
    d['@graph'].append({
        '@type': 'WebPage',
        '@id': SITE + m['path'] + '#page',
        'url': SITE + m['path'],
        'name': m['page_name'],
        'inLanguage': m['lang'],
        'description': m['og_desc'],
        'about': {'@id': SITE + '/#p'},
        'isPartOf': {'@id': SITE + '/#site'},
    })
    tag.string = json.dumps(d, ensure_ascii=False, separators=(',', ':'))


def tweak_css_js(html, lang):
    # 1 · asset paths are root-absolute so /ar/ resolves them the same way
    html = re.sub(r'(["\'\s(])\./', r'\1/', html)
    # 2 · the crossfade belonged to the in-page toggle
    html = re.sub(r'/\* 12 · language crossfade \*/\n'
                  r'\.swapping \[data-en\][^\n]*\n[^\n]*\n'
                  r'\[data-en\][^\n]*\n', '', html)
    # 3 · the toggle is a link now, so the whole paint() machinery goes
    html = re.sub(r'  /\* -+ 09 · language -+ \*/.*?\}\)\(\);',
                  RAIL_INIT, html, flags=re.S)
    # 4 · and so does the lazy Google-Fonts loader
    html = re.sub(r'  function loadArabicFont\(\) \{.*?\n  \}\n', '', html, flags=re.S)
    # 5 · the Arabic face ships only with the Arabic page
    if lang == 'ar':
        html = html.replace("<style>\n", "<style>\n" + NASKH, 1)
    else:
        html = html.replace("<head>\n", "<head>\n" + LEGACY, 1)
    return BANNER + html


def set_fonts(soup, lang):
    """Preload what the page actually renders with, and nothing else."""
    preloads = soup.find_all('link', rel='preload')
    if lang == 'ar':
        # Arabic sets every word on the page; Fraunces only shows through
        # on the latin bits, so the naskh goes first and the italic goes.
        for l in preloads:
            if 'fraunces-italic' in l.get('href', ''):
                l.decompose()
        head_anchor = soup.find('link', rel='preload')
        tag = soup.new_tag('link', href='/fonts/naskh-arabic.woff2')
        tag['rel'] = 'preload'; tag['as'] = 'font'
        tag['type'] = 'font/woff2'; tag['crossorigin'] = ''
        head_anchor.insert_before(tag)


RAIL_INIT = """  /* ---------- 09 · rails open on the first card ---------- */
  // WebKit keeps a pixel offset from the LEFT edge, which in RTL is the last
  // card. scrollLeft = 0 is the logical start in both engines and directions.
  $$('.rail').forEach(function (r) { r.scrollLeft = 0; });
})();"""


def build(lang):
    m = META[lang]
    soup = BeautifulSoup(io.open(SRC, encoding='utf-8').read(), 'html.parser')
    resolve(soup, lang)
    set_meta(soup, m)
    set_toggle(soup, m)
    set_jsonld(soup, m)
    set_fonts(soup, lang)
    html = tweak_css_js(str(soup), lang)
    out = os.path.join(ROOT, m['out'])
    os.makedirs(os.path.dirname(out) or '.', exist_ok=True)
    io.open(out, 'w', encoding='utf-8').write(html)
    return out, len(html.encode('utf-8'))


if __name__ == '__main__':
    for lang in ('en', 'ar'):
        path, n = build(lang)
        print('%-22s %6.1f KB' % (os.path.relpath(path, ROOT), n / 1024))
