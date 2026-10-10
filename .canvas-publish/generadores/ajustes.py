# -*- coding: utf-8 -*-
"""Dos pantallas nuevas para el canvas: Ajustes y Acerca de.

Se escriben como un parche sobre `gen.py` y `build.py`, igual que los otros
cambios del canvas, para que una corrida de `build.py` las emita junto al
resto y los artboards que ya existían no se muevan de lugar.
"""
import io, re, pathlib

GEN = pathlib.Path('gen.py')
BUILD = pathlib.Path('build.py')

NUEVO = r'''

# ============================================================ AJUSTES
def fila_ajuste(jp, titulo, nota, control, primera=False):
    """Una fila de ajuste: el glifo, lo que se ajusta, su explicación y el
    control al ras de la derecha.

    La explicación va SIEMPRE, no sólo cuando el nombre no alcanza: un ajuste
    que no dice qué hace obliga a probarlo para averiguarlo, y acá probar
    significa cambiarle el aspecto a la app entera.
    """
    borde = f'border-top: 1px solid {P["ink5"]}; ' if not primera else ''
    return (f'<div style="{borde}display: flex; align-items: center; gap: 12px; padding: 12px 13px">'
            f'<span style="width: 22px; flex: none; font-family: {MINCHO}; font-size: 17px; '
            f'line-height: 1; color: {P["ink2"]}">{jp}</span>'
            f'<span style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px">'
            f'<span style="font-size: 13px; font-weight: 500">{titulo}</span>'
            f'<span style="font-size: 11px; color: {P["ink3"]}">{nota}</span></span>'
            f'<span style="flex: none; display: flex">{control}</span></div>')


def segmento(opciones, activa):
    """El mismo control de tres estados que el rango de Estadísticas.

    El tema tiene TRES valores, no dos: automático, claro y oscuro. Un
    interruptor sólo sabe decir dos, así que con un interruptor «seguir al
    sistema» deja de poder elegirse, que es justamente el valor por omisión.
    """
    cel = ''
    for o in opciones:
        on = o == activa
        bg = f'background: {P["ink7"]}; ' if on else ''
        col = P['ink0'] if on else P['ink2']
        cel += (f'<span style="{bg}padding: 5px 12px; border-radius: 6px; font-size: 12px; '
                f'color: {col}; white-space: nowrap">{o}</span>')
    return (f'<span style="display: inline-flex; padding: 3px; border-radius: 8px; '
            f'background: {P["ink5"]}">{cel}</span>')


def ajustes(w, h):
    movil = w < 600

    # El tema en teléfono se parte en dos renglones: tres opciones de 12px más
    # el rótulo no entran en 390px sin apretar ninguna de las dos cosas.
    tema_ctl = segmento(['Auto', 'Claro', 'Oscuro'] if movil else
                        ['Automático', 'Claro', 'Oscuro'], 'Oscuro')

    # El idioma todavía no existe: va apagado y con la razón escrita, no
    # escondido. Una pantalla de ajustes que esconde lo que viene no dice nada;
    # una que lo muestra apagado dice qué va a haber y dónde.
    idioma_ctl = segmento(['Español', '日本語'], 'Español')
    idioma_ctl = (f'<span style="opacity: .42; display: inline-flex">{idioma_ctl}</span>')

    apariencia = (
        fila_ajuste('色', 'Tema', 'Seguir al sistema, o fijar uno.', tema_ctl, primera=True))

    idioma = fila_ajuste('語', 'Idioma de la interfaz',
                         'Pronto. Las cartas no cambian: siguen en japonés.',
                         idioma_ctl, primera=True)

    acerca_ctl = (f'<span style="font-size: 18px; color: {P["ink3"]}; line-height: 1">›</span>')
    info = fila_ajuste('情', 'Acerca de Kitsune Cards',
                       'Versión, fuentes y licencias.', acerca_ctl, primera=True)

    def caja(filas):
        return (f'<div style="background: {P["ink6"]}; border: 1px solid {P["ink4"]}; '
                f'border-radius: 9px; overflow: hidden">{filas}</div>')

    cuerpo = (f'<div style="padding: 16px; display: flex; flex-direction: column; gap: 14px">'
              f'{seclab("表示", "apariencia")}{caja(apariencia)}'
              f'{seclab("言語", "idioma")}{caja(idioma)}'
              f'{seclab("情報", "información")}{caja(info)}</div>')

    top = navbar_movil('Ajustes') if movil else topbar('')
    return marco(w, h, top + cuerpo + (tabbar('') if movil else ''))


# ============================================================ ACERCA DE
def acerca(w, h):
    movil = w < 600

    # La marca grande, con el nombre en katakana debajo: es la misma pieza que
    # la barra de arriba, un escalón más grande, porque acá la marca ES el
    # contenido y no un rótulo de navegación.
    marca = (f'<div style="display: flex; align-items: center; gap: 14px">'
             f'<span style="width: 52px; height: 52px; flex: none; border-radius: 10px; '
             f'display: grid; place-items: center; font-size: 34px; '
             f'background: rgba(196,64,46,.12)">🦊</span>'
             f'<span style="display: flex; flex-direction: column; gap: 1px">'
             f'<span style="font-size: 20px; font-weight: 700; line-height: 1.25">Kitsune Cards</span>'
             f'<span style="font-family: {KANA}; font-size: 12px; letter-spacing: .02em; '
             f'color: {P["ink3"]}">キツネ・カード</span></span></div>')

    lead = (f'<span style="font-size: 13px; line-height: 1.6; color: {P["ink2"]}">'
            f'Flashcards de kana y vocabulario japonés. Las cartas se escriben, '
            f'no se eligen de una lista: tipeás la lectura y la app corrige.</span>')

    def dato(rotulo, valor):
        return (f'<div style="display: flex; align-items: baseline; gap: 12px; font-size: 12px">'
                f'<span style="width: {72 if movil else 96}px; flex: none; color: {P["ink3"]}">{rotulo}</span>'
                f'<span style="flex: 1; min-width: 0; color: {P["ink2"]}">{valor}</span></div>')

    def caja(titulo, nota, filas):
        return (f'<div style="background: {P["ink6"]}; border: 1px solid {P["ink5"]}; '
                f'border-radius: 9px; padding: 13px; display: flex; flex-direction: column; gap: 8px">'
                f'<span style="display: flex; align-items: baseline; gap: 10px">'
                f'<span style="flex: 1; font-size: 11.5px; font-weight: 700">{titulo}</span>'
                f'<span style="font-size: 10.5px; color: {P["ink3"]}">{nota}</span></span>'
                f'{filas}</div>')

    version = caja('Versión', '', dato('App', '1.0.0') + dato('Actualizada', '4 de octubre de 2026'))

    # Las cuatro familias, con para qué se usa cada una: es la decisión
    # tipográfica de la app y acá es donde se puede contar.
    tip = caja('Tipografía', 'SIL Open Font License',
               dato('M PLUS 2', 'interfaz')
               + dato('M PLUS 1 Code', 'romaji y cifras')
               + dato('Zen Kaku Gothic New', 'kana de las listas')
               + dato('Zen Old Mincho', 'kanji de los rótulos'))

    # Esta caja no es cortesía: JMdict pide atribución, y una pantalla de
    # «acerca de» es el lugar donde esa obligación se cumple de verdad.
    datos = caja('Diccionario', 'atribución requerida',
                 dato('JMdict', 'Electronic Dictionary Research and Development Group')
                 + dato('Licencia', 'Creative Commons BY-SA 4.0'))

    hechocon = caja('Hecha con', '',
                    dato('Next.js', 'React') + dato('Mantine', 'componentes')
                    + dato('SQLite', 'los datos, en tu servidor'))

    nota_datos = (f'<span style="font-size: 11.5px; line-height: 1.6; color: {P["ink3"]}">'
                  f'Tus mazos y tus intentos viven en el servidor donde corre la app. '
                  f'No se manda nada a ningún lado.</span>')

    if movil:
        cuerpo = (f'<div style="padding: 16px; display: flex; flex-direction: column; gap: 14px">'
                  f'{marca}{lead}{version}{tip}{datos}{hechocon}{nota_datos}</div>')
    else:
        cuerpo = (f'<div style="padding: 16px; display: flex; flex-direction: column; gap: 14px">'
                  f'{marca}{lead}'
                  f'<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">'
                  f'{version}{tip}{datos}{hechocon}</div>{nota_datos}</div>')

    top = navbar_movil('Acerca de') if movil else topbar('')
    return marco(w, h, top + cuerpo + (tabbar('') if movil else ''))
'''

g = GEN.read_text(encoding='utf-8')
assert 'def ajustes(' not in g, 'ya estaba parcheado'
assert 'MINCHO' in g, 'gen.py tiene que importar MINCHO'
GEN.write_text(g.rstrip() + NUEVO, encoding='utf-8')
print('gen.py: ajustes() y acerca()')

b = BUILD.read_text(encoding='utf-8')
assert 'ajustes' not in b
b = b.replace(
    "from gen import (emitir, marco, practica, mazos, grupos, cartas, quiz, significados,\n"
    "                 stats, BOARDS)",
    "from gen import (emitir, marco, practica, mazos, grupos, cartas, quiz, significados,\n"
    "                 stats, ajustes, acerca, BOARDS)")
ancla = "FILAS_DEF.append(('Corrección, entrada y tokens', ["
assert ancla in b
b = b.replace(ancla, """FILAS_DEF.append(('Ajustes y Acerca de', [
    ('EscAjustes.dc.html', 'Ajustes', ajustes, D),
    ('TelAjustes.dc.html', 'Ajustes · teléfono', ajustes, M),
    ('EscAcerca.dc.html', 'Acerca de', acerca, D),
    ('TelAcerca.dc.html', 'Acerca de · teléfono', acerca, M),
], 900))

""" + ancla)
BUILD.write_text(b, encoding='utf-8')
print('build.py: fila nueva')
