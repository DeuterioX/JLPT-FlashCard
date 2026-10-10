# -*- coding: utf-8 -*-
"""El acceso a Ajustes: un engranaje, no un kanji.

Los kanji de la app rotulan CONTENIDO -文 escritura, 冊 volumen, 計 medición son
los tres destinos de estudio, y 新/改/削 dicen qué hace cada modal-. Los ajustes
no son contenido ni una acción sobre el contenido: son la app configurándose a
sí misma, y para eso el engranaje es lo que todo el mundo ya sabe leer.

Es el `GearFill` de Bootstrap Icons, el mismo set que usa la app, y relleno como
los otros glifos de acción que ya tiene -`PencilFill` en renombrar, `SunFill` y
`MoonStarsFill` en el tema-.
"""
import pathlib

LIB = pathlib.Path('lib.py')
GEN = pathlib.Path('gen.py')

GEAR = ('M9.405 1.05c-.413-1.4-2.397-1.4-2.81 0l-.1.34a1.464 1.464 0 0 1-2.105.872l-.31-.17c-1.283-.698-2.686.705-1.987 '
        '1.987l.169.311c.446.82.023 1.841-.872 2.105l-.34.1c-1.4.413-1.4 2.397 0 2.81l.34.1a1.464 1.464 0 0 1 .872 '
        '2.105l-.17.31c-.698 1.283.705 2.686 1.987 1.987l.311-.169a1.464 1.464 0 0 1 2.105.872l.1.34c.413 1.4 2.397 1.4 '
        '2.81 0l.1-.34a1.464 1.464 0 0 1 2.105-.872l.31.17c1.283.698 2.686-.705 1.987-1.987l-.169-.311a1.464 1.464 0 0 1 '
        '.872-2.105l.34-.1c1.4-.413 1.4-2.397 0-2.81l-.34-.1a1.464 1.464 0 0 1-.872-2.105l.17-.31c.698-1.283-.705-2.686-'
        '1.987-1.987l-.311.169a1.464 1.464 0 0 1-2.105-.872zM8 10.93a2.929 2.929 0 1 1 0-5.86 2.929 2.929 0 0 1 0 5.858z')

s = LIB.read_text(encoding='utf-8')
assert 'def engranaje(' not in s
ancla = 'def lupa(px=14, color=None):'
assert ancla in s
s = s.replace(ancla, '''def engranaje(px=14, color=None):
    """El `GearFill` de Bootstrap Icons, el mismo set que usa la app.

    `display: block` como la lupa: un SVG en línea le suma el descendente de la
    fuente a su caja y descentra la fila que lo contiene.
    """
    c = color or P['ink0']
    return (f'<svg viewBox="0 0 16 16" fill="{c}" aria-hidden="true" '
            f'style="width: {px}px; height: {px}px; display: block; flex: none">'
            f'<path d="''' + GEAR + '''"/></svg>')


''' + ancla)
LIB.write_text(s, encoding='utf-8')
print('lib.py: engranaje()')

# --- La barra de escritorio.
g = GEN.read_text(encoding='utf-8')
i = g.index('def barra_ajustes(')
j = g.find('\n\n\ndef ', i)
viejo = g[i:] if j < 0 else g[i:j]
nuevo = '''def barra_ajustes(activo=False):
    """La barra de arriba con el engranaje al ras de la derecha.

    No es una cuarta pestaña: las tres de abajo son lugares donde se estudia, y
    eso es lo que las hace comparables entre sí. Los ajustes no son un cuarto
    lugar de estudio, son donde se configura todo lo demás.

    Ocupa el lugar donde hoy está el botón de tema, que pasa a vivir adentro.
    """
    bg = f'background: {P["ink5"]}; ' if activo else ''
    col = P['ink0'] if activo else P['ink2']
    eng = (f'<span style="margin-left: auto; {bg}width: 30px; height: 26px; border-radius: 6px; '
           f'display: grid; place-items: center">{engranaje(15, col)}</span>')
    return topbar('')[:-6] + eng + '</div>'
'''
g = g.replace(viejo, nuevo)

# `engranaje` tiene que estar entre lo que gen.py importa de lib.
g = g.replace('from lib import (P, tema, UI, MINCHO, KANA, MONO, PAUTA, page, topbar, navbar_movil, tabbar,',
              'from lib import (P, tema, UI, MINCHO, KANA, MONO, PAUTA, page, topbar, navbar_movil, tabbar, engranaje,')
GEN.write_text(g, encoding='utf-8')
print('gen.py: la barra lleva engranaje')
