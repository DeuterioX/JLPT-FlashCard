# -*- coding: utf-8 -*-
"""Lleva los filetes de swipe a las tres listas de teléfono: cartas, mazos y
grupos. El filete deja de ser propiedad de la fila de carta y pasa a ser una
función sola, porque la regla es de la app y no de una pantalla."""
import io

FILOS = '''def filos_swipe(izq=True, der=True):
    """Los dos filetes de 3px que anuncian el swipe de una fila en teléfono.

    La regla, igual en las tres listas: el borde DERECHO lleva shu y descubre
    Borrar; el IZQUIERDO lleva verde y descubre la acción no destructiva de esa
    fila -Mover una carta, Renombrar un grupo, Practicar un mazo-. O sea que el
    color no dice QUÉ acción es -eso lo dice la palabra del panel cuando se
    abre-, dice si te podés arrepentir. Es la convención de iOS y es la única
    que sobrevive a que cada lista tenga verbos distintos.

    Cada filete existe sólo si esa acción está disponible en esa fila, así el
    borde nunca promete algo que el gesto no va a cumplir.

    Devuelve spans absolutos: la fila que los reciba tiene que ser
    `position: relative`.
    """
    s = ''
    if izq:
        s += (f'<span style="position: absolute; left: 0; top: 0; bottom: 0; width: 3px; '
              f'background: {P["verde"]}"></span>')
    if der:
        s += (f'<span style="position: absolute; right: 0; top: 0; bottom: 0; width: 3px; '
              f'background: {P["shu"]}"></span>')
    return s


'''

# 1. la función nueva, y `fila_carta` pasa a usarla
p = 'lib.py'
s = io.open(p, encoding='utf-8').read()
s = s.replace('def fila_carta(', FILOS + 'def fila_carta(', 1)

viejo = """    borde = '' if primera else f'border-top: 1px solid {P["ink5"]}; '
    filos = ''
    if mover:
        filos += (f'<span style="position: absolute; left: 0; top: 0; bottom: 0; width: 3px; '
                  f'background: {P["verde"]}"></span>')
    if borrar:
        filos += (f'<span style="position: absolute; right: 0; top: 0; bottom: 0; width: 3px; '
                  f'background: {P["shu"]}"></span>')
    return (f'<div style="{borde}position: relative;"""
nuevo = """    borde = '' if primera else f'border-top: 1px solid {P["ink5"]}; '
    filos = filos_swipe(mover, borrar)
    return (f'<div style="{borde}position: relative;"""
assert viejo in s, 'no encontre el cuerpo de fila_carta'
s = s.replace(viejo, nuevo)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# 2. mazos y grupos importan y usan los filetes
p = 'gen.py'
s = io.open(p, encoding='utf-8').read()
s = s.replace('tabbar, fila_carta,', 'tabbar, fila_carta, filos_swipe,', 1)

# MAZOS: Practicar siempre disponible; Borrar solo si el mazo es propio.
viejo = """        filas += (f'<div style="{borde}display: flex; align-items: center; gap: 12px; padding: 10px 13px">'
                  f'<span style="width: 34px; font-family: {KANA}; font-size: 17px; color: {P["ink0"]}">{ico}</span>'"""
nuevo = """        filos = filos_swipe(True, not builtin) if movil else ''
        rel = 'position: relative; ' if movil else ''
        filas += (f'<div style="{borde}{rel}display: flex; align-items: center; gap: 12px; '
                  f'padding: 10px 13px">{filos}'
                  f'<span style="width: 34px; font-family: {KANA}; font-size: 17px; color: {P["ink0"]}">{ico}</span>'"""
assert viejo in s, 'no encontre la fila de mazos'
s = s.replace(viejo, nuevo, 1)

# GRUPOS: el mazo de la maqueta es propio, asi que las dos. Un mazo incluido es
# solo lectura y no lleva ningun filete.
viejo = """        filas += (f'<div style="{borde}display: flex; align-items: center; gap: 12px; padding: 10px 13px">'
                  f'<span style="flex: 1; min-width: 0; display: flex; flex-direction: column">'
                  f'<span style="font-size: 13px; font-weight: 500">{nombre}</span>'"""
nuevo = """        filos = filos_swipe(True, True) if movil else ''
        rel = 'position: relative; ' if movil else ''
        filas += (f'<div style="{borde}{rel}display: flex; align-items: center; gap: 12px; '
                  f'padding: 10px 13px">{filos}'
                  f'<span style="flex: 1; min-width: 0; display: flex; flex-direction: column">'
                  f'<span style="font-size: 13px; font-weight: 500">{nombre}</span>'"""
assert viejo in s, 'no encontre la fila de grupos'
s = s.replace(viejo, nuevo, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok filos_swipe')
