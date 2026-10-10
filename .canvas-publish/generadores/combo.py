# -*- coding: utf-8 -*-
"""Tres variantes del control de un ajuste en teléfono, para comparar.

En 390px el segmento de tres opciones se come la mitad de la fila y la
explicación cae a dos renglones. Las alternativas son dos, y la tercera
pantalla muestra qué pasa al abrir.
"""
import io, json, pathlib
from lib import P, tema, MINCHO, KANA
from gen import emitir, marco, BOARDS
import gen
from lib import navbar_movil, tabbar, seclab
from gen import fila_ajuste, segmento


def selector(valor, apagado=False):
    """Variante A: una caja con el valor y el signo de que se despliega.

    Es la forma de un control, no la de un dato: tiene borde y fondo propios,
    así que se lee como algo que se toca. El mismo chevrón que usa la fila de
    «Acerca de», para que la lista no tenga dos signos distintos de «hay más».
    """
    op = 'opacity: .42; ' if apagado else ''
    return (f'<span style="{op}display: inline-flex; align-items: center; gap: 8px; '
            f'height: 30px; padding: 0 10px; border-radius: 7px; background: {P["ink5"]}; '
            f'border: 1px solid {P["ink4"]}; font-size: 13px; color: {P["ink0"]}; '
            f'white-space: nowrap">{valor}'
            f'<span style="font-size: 10px; color: {P["ink3"]}; line-height: 1">▾</span></span>')


def valor_chevron(valor, apagado=False):
    """Variante B: el valor en texto y el chevrón, sin caja.

    Deja la lista con UNA sola forma de fila: todo lo que se toca termina en
    un chevrón, y lo que hay antes es el valor de ahora. Es lo más compacto y
    lo más parecido a lo que hace el sistema operativo en sus propios ajustes.
    """
    op = 'opacity: .42; ' if apagado else ''
    return (f'<span style="{op}display: inline-flex; align-items: center; gap: 8px; '
            f'font-size: 13px; color: {P["ink2"]}; white-space: nowrap">{valor}'
            f'<span style="font-size: 18px; color: {P["ink3"]}; line-height: 1">›</span></span>')


def menu_abierto(opciones, elegida):
    """El desplegable abierto, anclado bajo el control.

    Va al nivel de la PANTALLA y no adentro de la fila: la caja de la lista
    recorta lo que se le sale (`overflow: hidden`, que es lo que mantiene las
    esquinas redondeadas de la primera y la última fila), así que un menú
    dibujado adentro queda cortado -pasó, se ve en el primer render-.

    Las medidas salen de dónde cae el control: 48 de la barra, 16 de aire, el
    encabezado de sección, el aire hacia la caja y el alto de la fila.
    """
    cel = ''
    for i, o in enumerate(opciones):
        on = o == elegida
        tick = (f'<span style="margin-left: auto; color: {P["verdeTxt"]}; font-size: 13px">✓</span>'
                if on else '')
        borde = f'border-top: 1px solid {P["ink5"]}; ' if i else ''
        cel += (f'<span style="{borde}display: flex; align-items: center; gap: 10px; '
                f'padding: 10px 12px; font-size: 13px; '
                f'color: {P["ink0"] if on else P["ink2"]}">{o}{tick}</span>')
    return (f'<span style="position: absolute; top: 147px; right: 29px; width: 164px; '
            f'background: {P["ink6"]}; border: 1px solid {P["ink4"]}; border-radius: 9px; '
            f'box-shadow: {P["sombraModal"]}; display: flex; flex-direction: column; '
            f'overflow: hidden; z-index: 3">{cel}</span>')


def caja(filas):
    return (f'<div style="background: {P["ink6"]}; border: 1px solid {P["ink4"]}; '
            f'border-radius: 9px; overflow: hidden">{filas}</div>')


def pantalla(control_tema, control_idioma, abierto=False):
    acerca = f'<span style="font-size: 18px; color: {P["ink3"]}; line-height: 1">›</span>'
    cuerpo = (f'<div style="padding: 16px; display: flex; flex-direction: column; gap: 14px">'
              f'{seclab("表示", "apariencia")}'
              f'{caja(fila_ajuste("色", "Tema", "Seguir al sistema, o fijar uno.", control_tema, primera=True))}'
              f'{seclab("言語", "idioma")}'
              f'{caja(fila_ajuste("語", "Idioma de la interfaz", "Pronto. Las cartas siguen en japonés.", control_idioma, primera=True))}'
              f'{seclab("情報", "información")}'
              f'{caja(fila_ajuste("情", "Acerca de Kitsune Cards", "Versión, fuentes y licencias.", acerca, primera=True))}</div>')
    extra = ''
    if abierto:
        # El velo tapa la pantalla y el menú va por encima: lo de atrás sigue
        # a la vista -se ve de qué ajuste salió- pero deja de ser tocable.
        extra = (f'<div style="position: absolute; inset: 0; background: rgba(8,10,9,.35); '
                 f'z-index: 2"></div>'
                 f'{menu_abierto(["Automático", "Claro", "Oscuro"], "Oscuro")}')
    return marco(390, 844, navbar_movil('Ajustes') + cuerpo + extra + tabbar(''))


VARIANTES = [
    ('TelAjustesSel', 'Ajustes · teléfono · A, caja desplegable',
     lambda: pantalla(selector('Oscuro'), selector('Español', apagado=True))),
    ('TelAjustesVal', 'Ajustes · teléfono · B, valor y chevrón',
     lambda: pantalla(valor_chevron('Oscuro'), valor_chevron('Español', apagado=True))),
    ('TelAjustesMenu', 'Ajustes · teléfono · A, desplegado',
     lambda: pantalla(selector('Oscuro'), selector('Español', apagado=True), abierto=True)),
]

X0, Y0, ANCHO, PAR, GAP = 7500, 12160, 390, 30, 180

nuevos = {}
x = X0
for nombre, titulo, fn in VARIANTES:
    tema('oscuro')
    emitir(f'{nombre}.dc.html', titulo, 390, 844, fn(), x, Y0)
    nuevos[f'{nombre}.dc.html'] = {'x': x, 'y': Y0, 'w': 390, 'h': 844, 'title': titulo}
    x += ANCHO + PAR
    tema('claro')
    emitir(f'Cl{nombre}.dc.html', titulo + ' · claro', 390, 844, fn(), x, Y0)
    nuevos[f'Cl{nombre}.dc.html'] = {'x': x, 'y': Y0, 'w': 390, 'h': 844, 'title': titulo + ' · claro'}
    x += ANCHO + GAP
tema('oscuro')

print('\n'.join(nuevos))
json.dump(nuevos, io.open('nuevos.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
