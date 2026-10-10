# -*- coding: utf-8 -*-
"""Correcciones sobre la primera pasada de Ajustes y Acerca de, mirando el render.

1. En escritorio el contenido se encolumna: con el ancho entero, el control de
   un ajuste quedaba a 1300px de su rótulo y la línea dejaba de leerse como una
   fila. Es el ancho de lectura que usan todas las pantallas de ajustes.
2. En teléfono el pie necesita aire: la barra de pestañas tapaba la última
   línea de Acerca de.
3. Las dos pantallas muestran CÓMO se llega: 設 al ras de la derecha de la
   barra de arriba, que es donde hoy está el botón de tema. No es una cuarta
   pestaña: las tres de abajo son destinos de estudio, y los ajustes no.
"""
import pathlib, re

GEN = pathlib.Path('gen.py')
g = GEN.read_text(encoding='utf-8')

# --- La barra de arriba con el engranaje, que en esta app es un kanji.
BARRA = '''

def barra_ajustes(activo=False):
    """La barra de arriba con 設 al ras de la derecha.

    Un kanji en mincho y no un piñón dibujado: los tres destinos de abajo ya se
    rotulan así -文, 冊, 計- y un ícono de otra familia en la misma barra se lee
    como de otra app. 設 es «disponer, establecer».

    Va en la barra y NO como cuarta pestaña: las tres pestañas son lugares
    donde se estudia, y eso es lo que las hace comparables entre sí. Los
    ajustes no son un cuarto lugar de estudio, son el lugar donde se configura
    todo lo demás.
    """
    bg = f'background: {P["ink5"]}; ' if activo else ''
    col = P['ink0'] if activo else P['ink2']
    eng = (f'<span style="margin-left: auto; {bg}width: 30px; height: 26px; border-radius: 6px; '
           f'display: grid; place-items: center; font-family: {MINCHO}; font-size: 16px; '
           f'line-height: 1; color: {col}">設</span>')
    return topbar('').replace('</div>', eng + '</div>', 1) if False else (
        topbar('')[:-6] + eng + '</div>')
'''
assert 'def barra_ajustes' not in g
g = g.rstrip() + BARRA
GEN.write_text(g, encoding='utf-8')

# --- Encolumnar en escritorio, aire abajo en teléfono, y usar la barra nueva.
g = GEN.read_text(encoding='utf-8')


def columna(nombre):
    """Envuelve el cuerpo de una pantalla en una columna de ancho de lectura."""
    global g
    viejo = f"    top = navbar_movil('{nombre}') if movil else topbar('')\n    return marco(w, h, top + cuerpo + (tabbar('') if movil else ''))"
    assert viejo in g, nombre
    nuevo = (
        "    if not movil:\n"
        "        # El ancho de lectura: con los 1440 enteros, el control de un ajuste\n"
        "        # queda a 1300px de su rótulo y la fila deja de leerse como una fila.\n"
        "        cuerpo = (f'<div style=\"display: flex; justify-content: center\">'\n"
        "                  f'<div style=\"width: 100%; max-width: 760px\">{cuerpo}</div></div>')\n"
        f"    top = navbar_movil('{nombre}') if movil else barra_ajustes(activo=True)\n"
        "    return marco(w, h, top + cuerpo + (tabbar('') if movil else ''))")
    g = g.replace(viejo, nuevo)


columna('Ajustes')
columna('Acerca de')

# El pie de teléfono: la barra de pestañas mide 56px y tapaba la última línea.
g = g.replace(
    "        cuerpo = (f'<div style=\"padding: 16px; display: flex; flex-direction: column; gap: 14px\">'\n"
    "                  f'{marca}{lead}{version}{tip}{datos}{hechocon}{nota_datos}</div>')",
    "        cuerpo = (f'<div style=\"padding: 16px 16px 72px; display: flex; flex-direction: column; '\n"
    "                  f'gap: 14px\">{marca}{lead}{version}{tip}{datos}{hechocon}{nota_datos}</div>')")

# Las cajas de Acerca de no se estiran para igualar a su vecina de al lado.
g = g.replace(
    "                  f'<div style=\"display: grid; grid-template-columns: 1fr 1fr; gap: 12px\">'\n"
    "                  f'{version}{tip}{datos}{hechocon}</div>{nota_datos}</div>')",
    "                  f'<div style=\"display: grid; grid-template-columns: 1fr 1fr; gap: 12px; '\n"
    "                  f'align-items: start\">{version}{tip}{datos}{hechocon}</div>{nota_datos}</div>')")

GEN.write_text(g, encoding='utf-8')
print('gen.py corregido')
