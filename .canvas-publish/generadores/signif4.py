# -*- coding: utf-8 -*-
"""El modo se elige arriba, al lado del mazo, no en la barra de abajo."""
import io

p = 'gen.py'
s = io.open(p, encoding='utf-8').read()

# 1. Fuera de la barra: vuelve a un solo boton.
viejo = """             f'<span style="display: flex; align-items: center; gap: 8px">{signif}'
             f'{boton("Escribir →", "primario")}</span></div>')"""
nuevo = """             f'{boton("Comenzar →", "primario")}</div>')"""
assert viejo in s, 'no encontre los dos botones'
s = s.replace(viejo, nuevo, 1)

viejo = """    # Los dos modos conviven en la barra: elegís los grupos y después con qué
    # los practicás. Acá está seleccionado Hiragana, y un kana no tiene
    # significado que repasar -`card.meaning` es NULL en los mazos incluidos-,
    # así que Significados va apagado.
    signif = (f'<span style="height: 36px; padding: 0 12px; display: inline-flex; align-items: center; '
              f'border-radius: 7px; background: {P["ink5"]}; border: 1px solid {P["ink4"]}; '
              f'color: {P["ink0"]}; font-size: 14px; font-weight: 600; white-space: nowrap; '
              f'opacity: .42">Significados →</span>')

"""
assert viejo in s, 'no encontre el boton de significados'
s = s.replace(viejo, '', 1)

# 2. Un segmento de modo al lado del de mazo.
viejo = """    sel = (f'<span style="display: flex; align-items: center; gap: 8px; font-size: 13px; '"""
nuevo = """    # El modo va ACÁ y no en la barra de abajo: con el rótulo de la barra más
    # dos botones, en 390px «4 grupos · 20 cartas» partía en dos líneas. Y
    # además pertenece acá: primero elegís qué practicar -mazo, grupos- y con
    # qué, y después la barra dice cuánto es y arranca.
    #
    # «Significados» va apagado porque el mazo elegido es Hiragana: un kana no
    # tiene significado que repasar -`card.meaning` es NULL en los mazos
    # incluidos-, y preguntar qué quiere decir あ no significa nada.
    modo = ''
    for t, on, hay in [('Escribir', True, True), ('Significados', False, False)]:
        if on:
            est = f'background: {P["ink7"]}; color: {P["ink0"]}'
        else:
            est = f'color: {P["ink2"]}' + ('' if hay else '; opacity: .42')
        modo += (f'<span style="padding: 4px 12px; border-radius: 6px; font-size: 12px; '
                 f'white-space: nowrap; {est}">{t}</span>')
    modobox = (f'<span style="display: inline-flex; padding: 3px; border-radius: 8px; '
               f'background: {P["ink5"]}">{modo}</span>')

    sel = (f'<span style="display: flex; align-items: center; gap: 8px; font-size: 13px; '"""
assert viejo in s, 'no encontre sel'
s = s.replace(viejo, nuevo, 1)

viejo = """    fila1 = (f'<div style="display: flex; align-items: center; justify-content: space-between; '
             f'gap: 12px; flex-wrap: wrap">{segbox}{"" if movil else sel}</div>')"""
nuevo = """    fila1 = (f'<div style="display: flex; align-items: center; justify-content: space-between; '
             f'gap: 12px; flex-wrap: wrap">'
             f'<span style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap">'
             f'{segbox}{modobox}</span>{"" if movil else sel}</div>')"""
assert viejo in s, 'no encontre fila1'
s = s.replace(viejo, nuevo, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
