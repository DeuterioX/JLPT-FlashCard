# -*- coding: utf-8 -*-
"""Vuelve el filete a borde con borde, sin radio."""
import io

p = 'lib.py'
s = io.open(p, encoding='utf-8').read()

viejo = """    Se retira 8px arriba y abajo en vez de ir de borde a borde. Con las filas
    pegadas -que es como están las tres listas- los filetes a tope se SUELDAN
    en una sola línea continua de punta a punta de la lista, y ahí dejan de
    leerse como «esta fila tiene acciones» y pasan a leerse como dos reglas
    decorativas enmarcando la caja. Retirado queda un tilde por fila, con 16px
    de aire entre uno y el siguiente, y el que falta se nota.

    Devuelve spans absolutos: la fila que los reciba tiene que ser
    `position: relative`.
    \"\"\"
    s = ''
    if izq:
        s += (f'<span style="position: absolute; left: 0; top: 8px; bottom: 8px; width: 3px; '
              f'border-radius: 0 2px 2px 0; background: {P["verde"]}"></span>')
    if der:
        s += (f'<span style="position: absolute; right: 0; top: 8px; bottom: 8px; width: 3px; '
              f'border-radius: 2px 0 0 2px; background: {P["shu"]}"></span>')
    return s"""
nuevo = """    Va de borde a borde de la fila, sin retiro y sin radio. Probé retirarlo 8px
    arriba y abajo para que se leyera como un tilde por fila en vez de una
    línea corrida, y sale peor: el filete queda de 3x39px apoyado ENCIMA del
    borde de 1px de la lista, el borde asoma en el hueco entre un filete y el
    siguiente, y el marco entero termina pareciendo un borde punteado rojo. A
    tope el filete tapa el borde en todo su tramo y la caja sigue siendo una
    caja.

    Que en una lista donde todas las filas tienen la misma acción quede una
    línea corrida no es un problema: es verdad. Lo que tiene que distinguirse
    es la fila que NO la tiene, y ahí el tramo sin pintar se ve igual -en
    Mazos, con un solo mazo propio, el shu es un tramo corto y evidente-.

    Devuelve spans absolutos: la fila que los reciba tiene que ser
    `position: relative`.
    \"\"\"
    s = ''
    if izq:
        s += (f'<span style="position: absolute; left: 0; top: 0; bottom: 0; width: 3px; '
              f'background: {P["verde"]}"></span>')
    if der:
        s += (f'<span style="position: absolute; right: 0; top: 0; bottom: 0; width: 3px; '
              f'background: {P["shu"]}"></span>')
    return s"""
assert viejo in s, 'no encontre el retiro'
io.open(p, 'w', encoding='utf-8', newline='\n').write(s.replace(viejo, nuevo))
print('ok')
