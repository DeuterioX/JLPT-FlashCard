# -*- coding: utf-8 -*-
"""Acerca de, rehecha: una frase fuerte, la hoja, y los créditos callados.

Lo que había eran cuatro cajas de pares clave-valor -versión, tipografía,
diccionario, hecha con- y tres párrafos que explicaban lo que hace cualquier
app de flashcards. Ninguna de las dos cosas se parecía a esta app.

Ahora la pantalla dice UNA cosa y la muestra: las cartas se escriben. La hoja
de 原稿用紙 con キツネ escrito es la firma del diseño -es la misma hoja donde
vive el kana del quiz- y no hay nada más en toda la app que la identifique
igual. Los créditos siguen estando, que la licencia de JMdict los exige, pero
en voz baja y en cuatro renglones en vez de cuatro cajas.
"""
import pathlib

GEN = pathlib.Path('gen.py')
g = GEN.read_text(encoding='utf-8')

i = g.index('def acerca(w, h):')
j = g.index('\n\n\ndef ', i)

NUEVO = '''def acerca(w, h):
    movil = w < 600
    ancho = 358 if movil else 760

    marca = (f'<div style="display: flex; flex-direction: column; align-items: center; gap: 10px">'
             f'<img src="{LOGO}" alt="" style="display: block; height: {84 if movil else 96}px; '
             f'width: auto">'
             f'<span style="display: flex; flex-direction: column; align-items: center; gap: 2px">'
             f'<span style="font-size: {20 if movil else 22}px; font-weight: 700; '
             f'line-height: 1.25">Kitsune Cards</span>'
             f'<span style="font-family: {KANA}; font-size: 13px; letter-spacing: .02em; '
             f'color: {P["ink3"]}">キツネ・カード</span></span></div>')

    # La frase va sola y grande: es la única idea que la pantalla tiene que
    # dejar. Lo que sigue la explica; lo de más abajo son datos.
    lema = (f'<span style="display: block; text-align: center; font-size: {19 if movil else 23}px; '
            f'font-weight: 700; line-height: 1.35; color: {P["ink0"]}">'
            f'Las cartas se escriben,<br>no se eligen.</span>')

    cuerpo_txt = (f'<div style="display: flex; flex-direction: column; gap: 10px; '
                  f'text-align: center; font-size: {13 if movil else 14}px; line-height: 1.65; '
                  f'color: {P["ink2"]}">'
                  f'<span>Reconocer la respuesta en una lista es fácil, y engaña: parece que '
                  f'la sabés. Escribirla de memoria no se puede fingir.</span>'
                  f'<span>Así que acá se teclea la lectura y la app corrige, hasta que ver '
                  f'<span style="font-family: {KANA}; color: {P["ink0"]}">あ</span> deje de ser '
                  f'traducir «a» y pase a ser, simplemente, leer.</span></div>')

    # La hoja de manuscrito, con el nombre escrito: es la firma del diseño y la
    # misma donde vive el kana del quiz.
    hoja = (f'<div style="display: flex; justify-content: center">'
            f'{hoja_quiz("キツネ", 104 if movil else 112, ancho, 80)}</div>')

    def credito(rotulo, texto):
        return (f'<div style="display: flex; flex-direction: column; gap: 2px">'
                f'<span class="ro" style="font-family: {MONO}; font-size: 9px; '
                f'letter-spacing: .08em; text-transform: uppercase; color: {P["ink3"]}">{rotulo}</span>'
                f'<span style="font-size: 12px; line-height: 1.55; color: {P["ink2"]}">{texto}</span></div>')

    creditos = (f'<div style="display: grid; grid-template-columns: {"1fr" if movil else "1fr 1fr"}; '
                f'gap: 14px 24px">'
                + credito('Versión', '1.0.0 · 4 de octubre de 2026')
                + credito('Hecha con', 'Next.js, Mantine y SQLite')
                + credito('Tipografía', 'M PLUS 2, M PLUS 1 Code, Zen Kaku Gothic New y '
                                        'Zen Old Mincho — SIL Open Font License')
                + credito('Diccionario', 'JMdict, del Electronic Dictionary Research and '
                                         'Development Group — CC BY-SA 4.0')
                + '</div>')

    pila = (f'<div style="display: flex; flex-direction: column; align-items: center; '
            f'gap: {18 if movil else 22}px; width: 100%; max-width: {ancho}px">'
            f'{marca}{lema}{cuerpo_txt}{hoja}'
            f'{seclab("情報", "información")}{creditos}</div>')

    cuerpo = (f'<div style="padding: {"20px 16px 72px" if movil else "24px 16px"}; '
              f'display: flex; justify-content: center">{pila}</div>')

    top = navbar_movil('Acerca de') if movil else barra_ajustes(activo=True)
    return marco(w, h, top + cuerpo + (tabbar('') if movil else ''))
'''

g = g[:i] + NUEVO + g[j:]
if 'hoja_quiz' not in g.split('\n')[4] and 'hoja_quiz,' not in g[:600]:
    g = g.replace('from lib import (P, tema, UI, MINCHO, KANA, MONO, PAUTA, page, topbar, navbar_movil, tabbar, engranaje, boton,',
                  'from lib import (P, tema, UI, MINCHO, KANA, MONO, PAUTA, page, topbar, navbar_movil, tabbar, engranaje, boton, hoja_quiz,')
GEN.write_text(g, encoding='utf-8')
print('gen.py: Acerca de, rehecha')
