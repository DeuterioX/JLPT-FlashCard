# -*- coding: utf-8 -*-
"""Los dos verbos de Practica, como un boton agrupado."""
import io

# ------------------------------------------------------------------ lib
p = 'lib.py'
s = io.open(p, encoding='utf-8').read()

NUEVO = '''def botones_juntos(items, h=36, fs=14, ancho_total=False):
    """Un botón partido en dos: dos acciones soldadas en un solo control.

    `items` es una lista de `(texto, tipo, apagado)`. Sueltas, dos acciones
    parecen dos cosas que no tienen nada que ver; juntas dicen que son la
    misma decisión con dos salidas -acá, arrancar la ronda de una manera o de
    la otra-.

    El radio vive en el contenedor y no en cada mitad -con `overflow: hidden`
    las esquinas de adentro salen rectas solas-, y la costura es un borde
    izquierdo en la segunda: contra el verde queda una línea oscura que separa
    sin agregar nada.
    """
    partes = ''
    for i, (txt, tipo, apagado) in enumerate(items):
        if tipo == 'primario':
            fondo, letra = P['verde'], P['verdeInk']
        else:
            fondo, letra = P['ink5'], P['ink0']
        costura = f'border-left: 1px solid {P["ink4"]}; ' if i else ''
        crece = 'flex: 1 1 0; ' if ancho_total else ''
        opac = 'opacity: .42; ' if apagado else ''
        partes += (f'<span style="{crece}{costura}{opac}height: {h}px; padding: 0 16px; '
                   f'display: inline-flex; align-items: center; justify-content: center; '
                   f'background: {fondo}; color: {letra}; font-size: {fs}px; font-weight: 600; '
                   f'white-space: nowrap">{txt}</span>')
    w = 'width: 100%; ' if ancho_total else ''
    return (f'<span style="{w}display: inline-flex; border-radius: 7px; overflow: hidden; '
            f'border: 1px solid {P["ink4"]}">{partes}</span>')


'''
assert 'def botones_juntos(' not in s
s = s.replace('def campo(', NUEVO + 'def campo(', 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# ------------------------------------------------------------------ gen
p = 'gen.py'
s = io.open(p, encoding='utf-8').read()
s = s.replace('tabbar, fila_carta, filos_swipe,', 'tabbar, fila_carta, filos_swipe, botones_juntos,', 1)

viejo = """    verbos = (f'{boton("Significados →", crecer=movil, apagado=not palabras)}'
              f'{boton("Escribir →", "primario", crecer=movil)}')"""
nuevo = """    verbos = botones_juntos([('Significados →', 'default', not palabras),
                             ('Escribir →', 'primario', False)], ancho_total=movil)"""
assert viejo in s, 'no encontre los verbos'
s = s.replace(viejo, nuevo, 1)

# el contenedor de los verbos ya no necesita separar nada
viejo = """        contenido = (f'{cuenta}<span style="display: flex; align-items: center; gap: 8px; '
                     f'width: 100%">{verbos}</span>')"""
nuevo = """        contenido = f'{cuenta}{verbos}'"""
assert viejo in s, 'no encontre el contenido movil'
s = s.replace(viejo, nuevo, 1)

viejo = """        contenido = f'{cuenta}<span style="display: flex; align-items: center; gap: 8px">{verbos}</span>'"""
nuevo = """        contenido = f'{cuenta}{verbos}'"""
assert viejo in s, 'no encontre el contenido de escritorio'
s = s.replace(viejo, nuevo, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
