# -*- coding: utf-8 -*-
"""En teléfono el control de un ajuste es una caja desplegable, no un segmento.

El segmento de tres opciones se comía la mitad de la fila en 390px y empujaba
la explicación a dos renglones. En escritorio se queda: ahí hay lugar y ver las
tres a la vez es mejor que esconderlas.
"""
import pathlib

GEN = pathlib.Path('gen.py')
g = GEN.read_text(encoding='utf-8')

SELECTOR = '''

def selector(valor, apagado=False):
    """El control de un ajuste en teléfono: el valor y el signo de que se abre.

    Tiene borde y fondo propios, así que se lee como algo que se toca y no como
    un dato más de la fila. Al tocarlo cae un menú anclado debajo, con tilde en
    la opción de ahora (ver `TelAjustesMenu` en el canvas).
    """
    op = 'opacity: .42; ' if apagado else ''
    return (f'<span style="{op}display: inline-flex; align-items: center; gap: 8px; '
            f'height: 30px; padding: 0 10px; border-radius: 7px; background: {P["ink5"]}; '
            f'border: 1px solid {P["ink4"]}; font-size: 13px; color: {P["ink0"]}; '
            f'white-space: nowrap">{valor}'
            f'<span style="font-size: 10px; color: {P["ink3"]}; line-height: 1">\\u25be</span></span>')
'''
assert 'def selector(' not in g
g = g.rstrip() + SELECTOR
GEN.write_text(g, encoding='utf-8')

g = GEN.read_text(encoding='utf-8')
viejo = """    # El tema en teléfono se parte en dos renglones: tres opciones de 12px más
    # el rótulo no entran en 390px sin apretar ninguna de las dos cosas.
    tema_ctl = segmento(['Auto', 'Claro', 'Oscuro'] if movil else
                        ['Automático', 'Claro', 'Oscuro'], 'Oscuro')"""
assert viejo in g
g = g.replace(viejo, """    # En teléfono una caja desplegable, en escritorio el segmento entero: tres
    # opciones de 12px más el rótulo no entran en 390px sin apretar las dos
    # cosas, y la explicación caía a dos renglones.
    tema_ctl = (selector('Oscuro') if movil
                else segmento(['Automático', 'Claro', 'Oscuro'], 'Oscuro'))""")

viejo2 = """    idioma_ctl = segmento(['Español', '日本語'], 'Español')
    idioma_ctl = (f'<span style="opacity: .42; display: inline-flex">{idioma_ctl}</span>')"""
assert viejo2 in g
g = g.replace(viejo2, """    if movil:
        idioma_ctl = selector('Español', apagado=True)
    else:
        idioma_ctl = segmento(['Español', '日本語'], 'Español')
        idioma_ctl = f'<span style="opacity: .42; display: inline-flex">{idioma_ctl}</span>'""")

GEN.write_text(g, encoding='utf-8')
print('gen.py: en teléfono, caja desplegable')
