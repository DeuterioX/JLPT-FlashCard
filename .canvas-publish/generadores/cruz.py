# -*- coding: utf-8 -*-
"""La celda del 原稿用紙 pasa a tener SIEMPRE sus cuatro bordes, solapados con
margen negativo, para que la cruz de guia caiga en pixeles enteros."""
import io

p = 'lib.py'
s = io.open(p, encoding='utf-8').read()

CELDA = '''def celda_genko(ch, lado, primera_col, primera_fila, fuente):
    """Una celda del papel de manuscrito, con su cruz de guía.

    Los cuatro bordes SIEMPRE, y las celdas que no arrancan fila o columna se
    corren 1px con margen negativo para que su borde caiga encima del de la
    vecina. Antes el borde repetido se sacaba con `border-left: none` /
    `border-top: none`, y eso rompía la cruz: con `box-sizing: border-box` la
    caja de relleno mide `lado` menos los bordes que le QUEDEN, así que a una
    celda sin borde izquierdo le mide `lado-1` de ancho y `lado-2` de alto. La
    cruz va en `left/top: 50%` de esa caja, o sea que un eje caía en medio
    píxel -difuso, repartido entre dos- y el otro en entero -nítido-, y una de
    las dos líneas se veía siempre más gruesa que la otra. Medido: con lado 98
    daba 48,5 contra 48.

    Con los cuatro bordes la caja es `lado-2` en los dos ejes, y como `lado` es
    par (ver `hoja_quiz`), la mitad es entera en los dos. El solapado dibuja
    una sola línea de 1px entre celdas, igual que antes.
    """
    m = ''
    if not primera_col:
        m += 'margin-left: -1px; '
    if not primera_fila:
        m += 'margin-top: -1px; '
    glifo = '' if ch == ' ' else (
        f'<span style="font-family: {MINCHO}; font-size: {fuente:.1f}px; line-height: 1; '
        f'color: {P["sumi"]}; position: relative">{ch}</span>')
    return (f'<span style="width: {lado}px; height: {lado}px; position: relative; '
            f'display: grid; place-items: center; border: 1px solid rgba(25,23,19,.16); '
            f'{m}flex: none">'
            f'<span style="position: absolute; left: 50%; top: 8%; bottom: 8%; width: 1px; '
            f'background: rgba(160,66,50,.20)"></span>'
            f'<span style="position: absolute; top: 50%; left: 8%; right: 8%; height: 1px; '
            f'background: rgba(160,66,50,.20)"></span>{glifo}</span>')


'''
assert 'def celda_genko(' not in s
s = s.replace('def progreso(', CELDA + 'def progreso(', 1)

viejo = """        celdas = ''
        for k, ch in enumerate(tramo):
            sin_izq = '' if k == 0 else 'border-left: none; '
            sin_arriba = '' if f == 0 else 'border-top: none; '
            glifo = '' if ch == ' ' else (
                f'<span style="font-family: {MINCHO}; font-size: {fuente:.1f}px; line-height: 1; '
                f'color: {P["sumi"]}; position: relative">{ch}</span>')
            celdas += (f'<span style="width: {lado}px; height: {lado}px; position: relative; '
                       f'display: grid; place-items: center; border: 1px solid rgba(25,23,19,.16); '
                       f'{sin_izq}{sin_arriba}flex: none">'
                       f'<span style="position: absolute; left: 50%; top: 8%; bottom: 8%; width: 1px; '
                       f'background: rgba(160,66,50,.20)"></span>'
                       f'<span style="position: absolute; top: 50%; left: 8%; right: 8%; height: 1px; '
                       f'background: rgba(160,66,50,.20)"></span>{glifo}</span>')
        filas.append(f'<div style="display: flex">{celdas}</div>')"""
nuevo = """        celdas = ''
        for k, ch in enumerate(tramo):
            celdas += celda_genko(ch, lado, k == 0, f == 0, fuente)
        filas.append(f'<div style="display: flex">{celdas}</div>')"""
assert viejo in s, 'no encontre las celdas de hoja_quiz'
s = s.replace(viejo, nuevo, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# ------------------------------------------------------------------ build
p = 'build.py'
s = io.open(p, encoding='utf-8').read()
s = s.replace('boton, campo, seclab, switch, tarjeta_grupo, hoja_quiz, modal)',
              'boton, campo, seclab, switch, tarjeta_grupo, hoja_quiz, celda_genko, modal)', 1)

viejo = """        celdas = ''
        for k in 'けんきゅうしゃ':
            celdas += (f'<span style="width: 34px; height: 34px; position: relative; display: grid; '
                       f'place-items: center; border: 1px solid rgba(25,23,19,.16); '
                       f'border-left: none; flex: none">'
                       f'<span style="position: absolute; left: 50%; top: 8%; bottom: 8%; width: 1px; '
                       f'background: rgba(160,66,50,.20)"></span>'
                       f'<span style="position: absolute; top: 50%; left: 8%; right: 8%; height: 1px; '
                       f'background: rgba(160,66,50,.20)"></span>'
                       f'<span style="font-family: {MINCHO}; font-size: 21px; line-height: 1; '
                       f'color: {P["sumi"]}">{k}</span></span>')
        hoja = (f'<div style="display: flex; background: {P["papel"]}; border-left: 1px solid '
                f'rgba(25,23,19,.16); border-radius: 3px; overflow: hidden; '
                f'box-shadow: {P["sombraHoja"]}">{celdas}</div>')"""
nuevo = """        # La misma celda que la hoja de verdad, no una copia a mano: la copia
        # traía el `border-left: none` que descentraba la cruz.
        celdas = ''.join(celda_genko(k, 34, i == 0, True, 21)
                         for i, k in enumerate('けんきゅうしゃ'))
        hoja = (f'<div style="display: flex; background: {P["papel"]}; border-radius: 3px; '
                f'overflow: hidden; box-shadow: {P["sombraHoja"]}">{celdas}</div>')"""
assert viejo in s, 'no encontre las celdas de anim_revelar'
s = s.replace(viejo, nuevo, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok cruz')
