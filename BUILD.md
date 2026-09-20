# Editing this site

`index.html` and `ar/index.html` are **generated**. Do not edit them.

Everything lives in **`src/index.html`**, where each string is written twice:

```html
<h2 data-en="Idea to Cast" data-ar="من الفكرة إلى البرونز">Idea to Cast</h2>
```

| Attribute | Sets |
|---|---|
| `data-en` / `data-ar` | the element's text |
| `data-en-html` / `data-ar-html` | text that contains markup |
| `data-en-href` / `data-ar-href` | a link (the WhatsApp prefills) |
| `data-en-alt` / `data-ar-alt` | an image's alt text |

Then rebuild:

```sh
python3 build.py        # needs: pip3 install beautifulsoup4
```

That writes `index.html` (English, at `/`) and `ar/index.html` (Arabic, at
`/ar/`), each with its own `<html lang>`, its own canonical, a reciprocal
hreflang set, and the language toggle pointing at the other one.

If you add a string, give it **both** languages. A missing `data-ar` silently
leaves English text on the Arabic page.
