# -*- coding: utf-8 -*-
"""El modal que abre una fila de ajuste, en teléfono y en escritorio."""
import io, json, pathlib
from lib import P, tema, MINCHO, KANA, modal, boton
from gen import emitir, marco, ajustes
import gen


def opcion(txt, nota='', elegida=False, apagada=False):
    """Una opción del modal, con el MISMO radio que «Mover palabra».

    La app ya tiene un modal para elegir una cosa de una lista, y usa radios con
    la fila elegida sobre un fondo. Un tilde a la derecha, que es lo que había
    dibujado antes, era una segunda manera de decir lo mismo: dos gramáticas
    para la misma pregunta.
    """
    bg = f'background: {P["ink5"]}; ' if elegida else ''
    op = 'opacity: .42; ' if apagada else ''
    punto = (f'<span style="width: 14px; height: 14px; flex: none; border-radius: 50%; border: 1px solid '
             f'{P["verde"] if elegida else P["ink4"]}; display: grid; place-items: center">'
             + (f'<span style="width: 7px; height: 7px; border-radius: 50%; '
                f'background: {P["verde"]}"></span>' if elegida else '')
             + '</span>')
    der = f'<span style="font-size: 11px; color: {P["ink3"]}">{nota}</span>' if nota else ''
    return (f'<div style="{bg}{op}display: flex; align-items: center; gap: 10px; padding: 8px 10px; '
            f'border-radius: 7px">{punto}'
            f'<span style="flex: 1; font-size: 13px">{txt}</span>{der}</div>')


def lista(filas):
    """Los radios van sueltos, sin caja alrededor: así los dibuja «Mover»."""
    return f'<div style="display: flex; flex-direction: column; gap: 2px">{filas}</div>'


def pie():
    """El modal cierra con Cancelar y el verbo, como todos los de la app."""
    return (f'<div style="display: flex; justify-content: flex-end; gap: 8px">'
            f'{boton("Cancelar")}{boton("Guardar", "primario")}</div>')


def cuerpo_tema():
    return (f'<div style="display: flex; flex-direction: column; gap: 10px">'
            f'{lista(opcion("Automático", "usar el del sistema") + opcion("Claro") + opcion("Oscuro", elegida=True))}'
            f'{pie()}</div>')


def cuerpo_idioma():
    # Las que todavía no existen van apagadas: dicen qué va a haber sin
    # prometer que ya anda.
    return (f'<div style="display: flex; flex-direction: column; gap: 10px">'
            f'{lista(opcion("Español", elegida=True) + opcion("日本語", "pronto", apagada=True) + opcion("English", "pronto", apagada=True))}'
            f'{pie()}</div>')


def velo(w, h, fondo, contenido):
    return marco(w, h, fondo + contenido)


def fondo(w, h):
    """La pantalla de ajustes, sin su propio marco, para que sirva de fondo."""
    dentro = ajustes(w, h)
    return dentro[dentro.index('>') + 1:].rsplit('</div>', 1)[0]


def mod_tema(w, h):
    ancho = 330 if w < 600 else 420
    return velo(w, h, fondo(w, h), modal('色 · Tema', cuerpo_tema(), ancho, w))


def mod_idioma(w, h):
    ancho = 330 if w < 600 else 420
    return velo(w, h, fondo(w, h), modal('語 · Idioma', cuerpo_idioma(), ancho, w))


D, M = (1440, 900), (390, 844)
# El tema en escritorio no tiene modal: ahí es el segmento, que muestra las tres
# opciones sin abrir nada. Las otras tres combinaciones sí.
VARIANTES = [
    ('TelAjustesTema', 'Elegir tema · teléfono', mod_tema, M),
    ('TelAjustesIdioma', 'Elegir idioma · teléfono', mod_idioma, M),
    ('EscAjustesIdioma', 'Elegir idioma · escritorio', mod_idioma, D),
]

X0, Y0, PAR, GAP = 7500, 12160, 30, 180
nuevos, x = {}, X0
for nombre, titulo, fn, (w, h) in VARIANTES:
    tema('oscuro')
    emitir(f'{nombre}.dc.html', titulo, w, h, fn(w, h), x, Y0)
    nuevos[f'{nombre}.dc.html'] = {'x': x, 'y': Y0, 'w': w, 'h': h, 'title': titulo}
    x += w + PAR
    tema('claro')
    emitir(f'Cl{nombre}.dc.html', titulo + ' · claro', w, h, fn(w, h), x, Y0)
    nuevos[f'Cl{nombre}.dc.html'] = {'x': x, 'y': Y0, 'w': w, 'h': h, 'title': titulo + ' · claro'}
    x += w + GAP
tema('oscuro')

json.dump(nuevos, io.open('nuevos2.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('\n'.join(nuevos))
