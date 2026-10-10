# -*- coding: utf-8 -*-
"""El filete se retira 8px arriba y abajo: un tilde por fila, no una regla."""
import io

p = 'lib.py'
s = io.open(p, encoding='utf-8').read()

viejo = """    Cada filete existe sólo si esa acción está disponible en esa fila, así el
    borde nunca promete algo que el gesto no va a cumplir.

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
nuevo = """    Cada filete existe sólo si esa acción está disponible en esa fila, así el
    borde nunca promete algo que el gesto no va a cumplir.

    Se retira 8px arriba y abajo en vez de ir de borde a borde. Con las filas
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
assert viejo in s, 'no encontre el cuerpo de filos_swipe'
io.open(p, 'w', encoding='utf-8', newline='\n').write(s.replace(viejo, nuevo))
print('ok retiro')
