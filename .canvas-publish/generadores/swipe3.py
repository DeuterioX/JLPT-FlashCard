# -*- coding: utf-8 -*-
"""El tablero del gesto pasa a explicar la regla para las tres listas."""
import io

NUEVA = '''def anim_swipe(w, h):
    """El gesto de la fila en teléfono, en las tres listas que lo tienen."""
    def fila(despl, izq, der):
        capas = ''
        if izq:
            capas += (f'<span style="position: absolute; left: 0; top: 0; bottom: 0; width: 88px; '
                      f'background: {P["verde"]}; color: {P["verdeInk"]}; display: flex; align-items: center; '
                      f'justify-content: center; font-size: 13px; font-weight: 600">Mover</span>')
        if der:
            capas += (f'<span style="position: absolute; right: 0; top: 0; bottom: 0; width: 88px; '
                      f'background: {P["shu"]}; color: #F7F3EA; display: flex; align-items: center; '
                      f'justify-content: center; font-size: 13px; font-weight: 600">Borrar</span>')
        return (f'<div style="position: relative; width: 330px; height: 62px; border-radius: 8px; '
                f'overflow: hidden; border: 1px solid {P["ink4"]}">{capas}'
                f'<span style="position: absolute; inset: 0; transform: translateX({despl}px); '
                f'background: {P["ink6"]}; display: flex; flex-direction: column; justify-content: center; '
                f'padding: 0 13px; gap: 2px">'
                f'<span><span style="font-family: {KANA}; font-size: 16px">けんきゅうしゃ</span> '
                f'<span style="font-family: {MONO}; font-size: 13px; color: {P["ink2"]}">kenkyuusha</span></span>'
                f'<span style="font-size: 13px; color: {P["ink2"]}">Investigador</span></span></div>')

    pasos = [(0, False, False, 'reposo'), (88, True, False, '→ mover'), (-88, False, True, '← borrar')]
    tira = ''
    for d, i, de, lab in pasos:
        tira += (f'<div style="display: flex; flex-direction: column; gap: 8px">{fila(d, i, de)}'
                 f'<span style="font-family: {MONO}; font-size: 10px; color: {P["ink3"]}">{lab}</span></div>')

    # Una fila de muestra por caso: el filete de cada borde existe sólo si esa
    # acción está disponible en esa fila.
    def mini(lista, nombre, sub, izq, der, verbos, kana=False):
        tipo = f'font-family: {KANA}; ' if kana else ''
        return (f'<div style="display: flex; align-items: center; gap: 12px">'
                f'<div style="position: relative; width: 300px; height: 44px; flex: none; '
                f'border: 1px solid {P["ink4"]}; border-radius: 8px; background: {P["ink6"]}; '
                f'display: flex; flex-direction: column; justify-content: center; padding: 0 13px; '
                f'overflow: hidden">{filos_swipe(izq, der)}'
                f'<span style="{tipo}font-size: 12.5px; font-weight: 500">{nombre}</span>'
                f'<span style="font-size: 10.5px; color: {P["ink3"]}">{sub}</span></div>'
                f'<span style="display: flex; flex-direction: column; gap: 1px; width: 220px">'
                f'<span style="font-size: 11px; font-weight: 600">{lista}</span>'
                f'<span style="font-family: {MONO}; font-size: 10px; color: {P["ink3"]}">{verbos}</span>'
                f'</span></div>')

    casos = [
        mini('Cartas', 'けんきゅうしゃ', 'kenkyuusha · Investigador', True, True,
             '← Mover · Borrar →', kana=True),
        mini('Cartas', 'けんきゅうしゃ', 'kenkyuusha · Investigador', False, True,
             'un solo grupo: no hay dónde mover', kana=True),
        mini('Mazos', 'Minna no Nihongo I', '5 grupos · 149 cartas', True, True,
             '← Practicar · Borrar →'),
        mini('Mazos', 'Hiragana', '26 grupos · 104 cartas', True, False,
             'un mazo incluido no se borra'),
        mini('Grupos', 'Unidad 1', '30 cartas', True, True,
             '← Renombrar · Borrar →'),
        mini('Grupos', 'Serie A', '5 cartas', False, False,
             'mazo incluido: sólo lectura, ningún gesto'),
    ]
    estados = (f'<div style="display: grid; grid-template-columns: repeat(2, max-content); '
               f'gap: 14px 30px">{"".join(casos)}</div>')

    nota = (f'<p style="margin: 0; font-size: 12.5px; color: {P["ink2"]}; max-width: 78ch; line-height: 1.6">'
            f'Sólo en pantallas táctiles. La cara que se desliza es la que lleva el fondo, así que el hover '
            f'va ahí y no en el contenedor. En reposo, cada borde lleva un filete de 3px del color de la '
            f'acción que ese gesto descubre, que es lo único que hoy le falta a la fila: las acciones '
            f'existen y nada las anuncia.</p>'
            f'<p style="margin: 0; font-size: 12.5px; color: {P["ink2"]}; max-width: 78ch; line-height: 1.6">'
            f'El color no dice cuál es la acción —eso lo dice la palabra del panel cuando se abre—, dice si '
            f'te podés arrepentir: <b>shu a la derecha es siempre Borrar</b>, y el <b>verde de la izquierda '
            f'es la acción no destructiva de esa lista</b>: Mover una carta, Renombrar un grupo, Practicar '
            f'un mazo. Es la convención de iOS y es la única que sobrevive a que cada lista tenga verbos '
            f'distintos. Un filete que no está es una acción que no está: el borde nunca promete algo que '
            f'el gesto no va a cumplir.</p>')
    cuerpo = (f'<div style="padding: 32px; display: flex; flex-direction: column; gap: 22px">'
              f'<div style="display: flex; flex-direction: column; gap: 6px">'
              f'<span style="font-family: {MINCHO}; font-size: 22px">滑 · Gesto de fila</span>'
              f'<span style="font-size: 12px; color: {P["ink3"]}">Mazos, grupos y cartas · sólo teléfono</span></div>'
              f'<div style="display: flex; gap: 26px; flex-wrap: wrap">{tira}</div>'
              f'{estados}{nota}</div>')
    return marco(w, h, cuerpo)


'''

p = 'build.py'
s = io.open(p, encoding='utf-8').read()
i = s.index('def anim_swipe(')
j = s.index('def anim_error(')
s = s[:i] + NUEVA + s[j:]
s = s.replace('_titulo_modal, fila_carta,', '_titulo_modal, fila_carta, filos_swipe,', 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('anim_swipe reescrito')
