# -*- coding: utf-8 -*-
"""Acerca de: el logo de verdad, qué es la app y para qué, y sin la línea de datos."""
import pathlib

LOGO = '/_blob/66853c1445a9ef7f01c3a8eadb595a09'

GEN = pathlib.Path('gen.py')
g = GEN.read_text(encoding='utf-8')


def rep(a, b):
    global g
    assert a in g, a[:70]
    g = g.replace(a, b)


# El zorro de la app, no el emoji. El emoji es un dibujo de otra familia -a
# color, de otra mano- y acá la marca ES el contenido de la pantalla.
rep("""    marca = (f'<div style="display: flex; align-items: center; gap: 14px">'
             f'<span style="width: 52px; height: 52px; flex: none; border-radius: 10px; '
             f'display: grid; place-items: center; font-size: 34px; '
             f'background: rgba(196,64,46,.12)">🦊</span>'
             f'<span style="display: flex; flex-direction: column; gap: 1px">'
             f'<span style="font-size: 20px; font-weight: 700; line-height: 1.25">Kitsune Cards</span>'
             f'<span style="font-family: {KANA}; font-size: 12px; letter-spacing: .02em; '
             f'color: {P["ink3"]}">キツネ・カード</span></span></div>')""",
    """    # El logo va grande y solo, centrado: en «acerca de» la marca no es un
    # rótulo de navegación, es lo primero que la pantalla dice. Sin caja de
    # color detrás -el dibujo ya trae su fondo- y con el alto fijo, que es la
    # medida que no cambia si el dibujo cambia.
    marca = (f'<div style="display: flex; flex-direction: column; align-items: center; '
             f'gap: 10px; padding: 8px 0 2px">'
             f'<img src="{LOGO}" alt="" style="display: block; height: 96px; width: auto">'
             f'<span style="display: flex; flex-direction: column; align-items: center; gap: 2px">'
             f'<span style="font-size: 22px; font-weight: 700; line-height: 1.25">Kitsune Cards</span>'
             f'<span style="font-family: {KANA}; font-size: 13px; letter-spacing: .02em; '
             f'color: {P["ink3"]}">キツネ・カード</span></span></div>')""")

# Qué es y para qué. Lo primero dice qué hace; lo segundo, por qué está hecha
# así, que es lo único que la distingue de cualquier otra app de flashcards.
rep("""    lead = (f'<span style="font-size: 13px; line-height: 1.6; color: {P["ink2"]}">'
            f'Flashcards de kana y vocabulario japonés. Las cartas se escriben, '
            f'no se eligen de una lista: tipeás la lectura y la app corrige.</span>')""",
    """    lead = (f'<div style="display: flex; flex-direction: column; gap: 10px; '
            f'font-size: 13px; line-height: 1.6; color: {P["ink2"]}">'
            f'<span>Flashcards para aprender a leer japonés: los dos silabarios primero, '
            f'y después vocabulario, con su significado.</span>'
            f'<span>Las cartas se <b style="color: {P["ink0"]}; font-weight: 600">escriben</b>. '
            f'No hay «¿la sabía?» ni opciones para elegir: tipeás la lectura y la app '
            f'corrige. Recordar cuesta más que reconocer, y es lo que hace que la próxima '
            f'vez salga sola.</span>'
            f'<span>El objetivo es dejar de traducir en la cabeza: que ver あ sea '
            f'<i>leer</i>, no acordarse.</span></div>')""")

# La línea de los datos se va: decía algo técnico que no es de esta pantalla.
rep("""    nota_datos = (f'<span style="font-size: 11.5px; line-height: 1.6; color: {P["ink3"]}">'
                  f'Tus mazos y tus intentos viven en el servidor donde corre la app. '
                  f'No se manda nada a ningún lado.</span>')""",
    """    nota_datos = ''""")

GEN.write_text(g, encoding='utf-8')
print('gen.py: logo, descripción y sin la línea de datos')
