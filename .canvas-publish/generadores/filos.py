# -*- coding: utf-8 -*-
"""Agrega los filetes de swipe a la fila de carta en teléfono."""
import io

FILA = '''def fila_carta(kana, rom, sig, primera=False, mover=True, borrar=True):
    """La fila de carta en teléfono, con un filete en cada borde del color de la
    acción que ese gesto descubre: verde a la izquierda para mover, shu a la
    derecha para borrar.

    Hoy las acciones de swipe son invisibles hasta que hacés el gesto: no hay
    nada que diga que están ahí ni para qué lado va cada una. El filete lo dice
    sin ocupar ancho, y se apaga cuando la acción no está disponible -mover
    necesita que el mazo tenga más de un grupo; un mazo de fábrica no permite
    ninguna de las dos-, así que el borde no promete algo que el gesto no va a
    cumplir.
    """
    borde = '' if primera else f'border-top: 1px solid {P["ink5"]}; '
    filos = ''
    if mover:
        filos += (f'<span style="position: absolute; left: 0; top: 0; bottom: 0; width: 3px; '
                  f'background: {P["verde"]}"></span>')
    if borrar:
        filos += (f'<span style="position: absolute; right: 0; top: 0; bottom: 0; width: 3px; '
                  f'background: {P["shu"]}"></span>')
    return (f'<div style="{borde}position: relative; padding: 10px 16px; display: flex; '
            f'flex-wrap: wrap; column-gap: 12px; row-gap: 2px">{filos}'
            f'<span style="font-family: {KANA}; font-size: 16px; line-height: 1.55">{kana}</span>'
            f'<span style="font-family: {MONO}; font-size: 14px; color: {P["ink2"]}; '
            f'align-self: center">{rom}</span>'
            f'<span style="width: 100%; font-size: 14px; color: {P["ink2"]}">{sig}</span></div>')


'''

p = 'lib.py'
s = io.open(p, encoding='utf-8').read()
s = s.replace('def tarjeta_grupo(', FILA + 'def tarjeta_grupo(')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# la lista de cartas en teléfono usa la fila nueva
p = 'gen.py'
s = io.open(p, encoding='utf-8').read()
viejo = """        if movil:
            filas += (f'<div style="{borde}padding: 10px 13px; display: flex; flex-wrap: wrap; '
                      f'column-gap: 12px; row-gap: 2px">'
                      f'<span style="font-family: {KANA}; font-size: 16px; line-height: 1.55">{k}</span>'
                      f'<span style="font-family: {MONO}; font-size: 14px; color: {P["ink2"]}; '
                      f'align-self: center">{r}</span>'
                      f'<span style="width: 100%; font-size: 14px; color: {P["ink2"]}">{m}</span></div>')"""
nuevo = """        if movil:
            filas += fila_carta(k, r, m, primera=(i == 0))"""
assert viejo in s, 'no encontré la fila móvil'
s = s.replace(viejo, nuevo)
s = s.replace("from lib import (P, UI, MINCHO, KANA, MONO, PAUTA, page, topbar, navbar_movil, tabbar,",
              "from lib import (P, UI, MINCHO, KANA, MONO, PAUTA, page, topbar, navbar_movil, tabbar, fila_carta,")
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
