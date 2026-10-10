# -*- coding: utf-8 -*-
"""Pone el canvas al día con la app (6 y 7 de octubre de 2026).

Parchea lib.py, gen.py y datos.py en el lugar, como los demás scripts de
cambios: el generador queda siendo la fuente de verdad.
"""
import io, pathlib

LIB = pathlib.Path('lib.py')
GEN = pathlib.Path('gen.py')
DAT = pathlib.Path('datos.py')
lib = LIB.read_text(encoding='utf-8')
gen = GEN.read_text(encoding='utf-8')
dat = DAT.read_text(encoding='utf-8')


def cambiar(texto, viejo, nuevo, nombre):
    assert viejo in texto, f'no encontré el bloque en {nombre}: {viejo[:60]!r}'
    return texto.replace(viejo, nuevo, 1)


# ------------------------------------------------------------ lib.py

# 1. La barra de escritorio lleva el engranaje al ras de la derecha en TODAS
#    las pantallas, como en la app: reemplazó al botón de tema.
lib = cambiar(lib, '''def topbar(activo='Práctica'):''', '''def topbar(activo='Práctica', ajustes=False):''', 'lib')
lib = cambiar(lib, '''            f'<span style="display: flex; gap: 4px">{links}</span></div>')


def navbar_movil''', '''            f'<span style="display: flex; gap: 4px">{links}</span>{_engranaje_barra(ajustes)}</div>')


def _engranaje_barra(activo=False):
    """El botón del engranaje de la barra de escritorio: el `default` de la
    app, 30px de alto como la píldora del menú. Apretado (en Ajustes y Acerca
    de) va con el relleno de la píldora activa."""
    bg = P['ink4'] if activo else P['ink5']
    return (f'<span style="margin-left: auto; width: 34px; height: 30px; border-radius: 7px; '
            f'background: {bg}; border: 1px solid {P["ink4"]}; display: grid; place-items: center">'
            f'{engranaje(15, P["ink0"])}</span>')


def navbar_movil''', 'lib')

# 2. En teléfono la flecha de volver y la acción de la barra van sin marco y de
#    alto completo: lo que importa es que sean fáciles de acertar con el pulgar.
lib = cambiar(lib, '''        back = (f'<span style="width: 30px; height: 30px; flex: none; display: grid; place-items: center; '
                f'border: 1px solid {P["ink4"]}; border-radius: 7px; background: {P["ink5"]}; '
                f'color: {P["ink0"]}; font-size: 15px; line-height: 1">‹</span>')''',
              '''        back = (f'<span style="align-self: stretch; flex: none; display: grid; place-items: center; '
                f'padding: 0 16px; margin-left: -16px; color: {P["ink0"]}">{chevron_izq(15)}</span>')''', 'lib')
lib = cambiar(lib, '''            f'<span style="margin-left: auto; flex: none">{accion}</span></div>')''',
              '''            f'<span style="margin-left: auto; flex: none; align-self: stretch; display: flex; '
            f'align-items: center">{accion}</span></div>')


def accion_barra(glifo):
    """Una acción de la barra de teléfono -el engranaje, el lápiz-: sin marco y
    de punta a punta en vertical, con el blanco llegando al borde de la
    pantalla sin mover el glifo."""
    return (f'<span style="align-self: stretch; display: grid; place-items: center; '
            f'padding: 0 16px; margin-right: -16px">{glifo}</span>')


def chevron_izq(px=15):
    """El `ChevronLeft` de Bootstrap Icons, el de la flecha de volver de la app."""
    return (f'<svg viewBox="0 0 16 16" fill="currentColor" aria-hidden="true" '
            f'style="width: {px}px; height: {px}px; display: block">'
            f'<path fill-rule="evenodd" d="M11.354 1.646a.5.5 0 0 1 0 .708L5.707 8l5.647 5.646a.5.5 0 0 1-.708.708l-6-6a.5.5 0 0 1 0-.708l6-6a.5.5 0 0 1 .708 0"/></svg>')


def lapiz(px=15, color=None):
    """El `PencilFill` de Bootstrap Icons, el de «Renombrar» en teléfono."""
    c = color or P['ink0']
    return (f'<svg viewBox="0 0 16 16" fill="{c}" aria-hidden="true" '
            f'style="width: {px}px; height: {px}px; display: block">'
            f'<path d="M12.854.146a.5.5 0 0 0-.707 0L10.5 1.793 14.207 5.5l1.647-1.646a.5.5 0 0 0 0-.708zm.646 6.061L9.793 2.5 3.293 9H3.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.5h.5a.5.5 0 0 1 .5.5v.207zm-7.468 7.468A.5.5 0 0 1 6 13.5V13h-.5a.5.5 0 0 1-.5-.5V12h-.5a.5.5 0 0 1-.5-.5V11h-.5a.5.5 0 0 1-.5-.5V10h-.5a.5.5 0 0 1-.175-.032l-.179.178a.5.5 0 0 0-.11.168l-2 5a.5.5 0 0 0 .65.65l5-2a.5.5 0 0 0 .168-.11z"/></svg>')''', 'lib')

# 3. La tarjeta de grupo: el nombre en UNA línea con elipsis -partido empujaba
#    la hoja y cada una arrancaba a otra altura- y «N palabras más» debajo.
lib = cambiar(lib, '''def tarjeta_grupo(nombre, filas, on, alto=242, kana_px=19, paso=38.4):''',
              '''def tarjeta_grupo(nombre, filas, on, alto=242, kana_px=19, paso=38.4, mas=0):''', 'lib')
lib = cambiar(lib, '''            f'<span style="font-size: 11.5px; font-weight: 500; color: {P["ink0"] if on else P["ink2"]}">{nombre}</span>'
            f'{switch(on)}</span>\'''',
              '''            f'<span style="flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; '
            f'font-size: 11.5px; font-weight: 500; color: {P["ink0"] if on else P["ink2"]}">{nombre}</span>'
            f'{switch(on)}</span>\'''', 'lib')
lib = cambiar(lib, '''            f'background-image: {PAUTA.format(paso)}">{renglones}</span></div>')''',
              '''            f'background-image: {PAUTA.format(paso)}">{renglones}</span>'
            + (f'<span style="text-align: center; font-size: 12px; color: {P["ink0"] if on else P["ink3"]}">'
               f'{mas} palabra{"s" if mas > 1 else ""} más</span>' if mas > 0 else '')
            + '</div>')''', 'lib')
LIB.write_text(lib, encoding='utf-8')

# ------------------------------------------------------------ datos.py

# 4. Minna no Nihongo I viene con la app desde el 6/10 (es un mazo incluido),
#    cargado del markdown de vocabulario: 62 grupos en ocho lecciones.
dat = cambiar(dat, '''    ('Minna no Nihongo I', '5 grupos · 149 cartas · Unidad 1, Unidad 2, Unidad 3…', False),''',
              '''    ('Minna no Nihongo I', '62 grupos · 598 cartas · lección 1, lección 2, lección 3, lección 4…', True),''',
              'datos')
DAT.write_text(dat, encoding='utf-8')

# ------------------------------------------------------------ gen.py

gen = cambiar(gen, '''    return boton(engranaje(15, P['ink0']), h=30, fs=13)''',
              '''    return accion_barra(engranaje(15, P['ink0']))''', 'gen')
gen = cambiar(gen, 'from lib import (P, tema, UI, MINCHO, KANA, MONO, PAUTA, page, topbar, navbar_movil, tabbar,',
              'from lib import (P, tema, UI, MINCHO, KANA, MONO, PAUTA, page, topbar, navbar_movil, tabbar, accion_barra, lapiz,',
              'gen')
gen = cambiar(gen, '''from datos import (''', '''from minna_datos import MINNA
from datos import (''', 'gen')

# 5. Los verbos de Práctica: «Repasar significados» y «Repasar escritura».
gen = cambiar(gen, '''    verbos = botones_juntos([('Significados ➜', 'default', not palabras),
                             ('Escribir ➜', 'primario', False)], ancho_total=movil)''',
              '''    verbos = botones_juntos([('Repasar significados', 'default', not palabras),
                             ('Repasar escritura', 'primario', False)], ancho_total=movil)''', 'gen')

# 6. Práctica con palabras: Minna no Nihongo de verdad, con sus lecciones como
#    secciones y sus grupos como tarjetas.
gen = cambiar(gen, '''    tarjetas = ''
    for i, (nombre, filas) in enumerate(grupos_v):
        tarjetas += tarjeta_grupo(nombre, filas, i in encendidas, alto, kpx, paso)
    grid = (f'<div style="display: grid; grid-template-columns: repeat({cols}, 1fr); '
            f'gap: 10px">{tarjetas}</div>')''',
              '''    def grilla(items):
        # `minmax(0, 1fr)` y no `1fr`: con `1fr` una columna no baja de su
        # contenido, y en teléfono una palabra larga empujaba la tercera
        # tarjeta fuera de la pantalla.
        return (f'<div style="display: grid; grid-template-columns: repeat({cols}, minmax(0, 1fr)); '
                f'gap: 10px">{items}</div>')

    if palabras:
        # Las dos primeras lecciones, cada una con su encabezado de sección. En
        # teléfono entra la primera y el arranque de la segunda.
        bloques, n_on, c_on = '', 0, 0
        for leccion in ['Lección 1', 'Lección 2']:
            items = ''
            for i, (sec, nombre, total, prev) in enumerate([g for g in MINNA if g[0] == leccion]):
                on = leccion == 'Lección 1' and i in (0, 2)
                n_on, c_on = n_on + on, c_on + (total if on else 0)
                vis = prev[:filas_n]
                items += tarjeta_grupo(nombre, vis, on, alto, kpx, paso, mas=total - len(vis))
            bloques += seclab('', leccion) + grilla(items)
        grid = bloques
    else:
        tarjetas = ''
        for i, (nombre, filas) in enumerate(grupos_v):
            tarjetas += tarjeta_grupo(nombre, filas, i in encendidas, alto, kpx, paso)
        grid = grilla(tarjetas)''', 'gen')
gen = cambiar(gen, '''              f'<b style="color: {P["ink0"]}">{3 if palabras else 4}</b> grupos · '
              f'<b style="color: {P["ink0"]}">{92 if palabras else 20}</b> cartas</span>')''',
              '''              f'<b style="color: {P["ink0"]}">{n_on if palabras else 4}</b> grupos · '
              f'<b style="color: {P["ink0"]}">{c_on if palabras else 20}</b> cartas</span>')''', 'gen')

# 7. Las rondas en teléfono usan la MISMA barra que el resto: flecha de volver
#    a Práctica, el nombre del modo y el contexto a la derecha.
gen = cambiar(gen, '''    top = (f'<div style="height: 48px; display: flex; align-items: center; justify-content: space-between; '
           f'padding: 0 16px; background: {P["ink6"]}; border-bottom: 1px solid {P["ink5"]}">'
           f'<span style="display: flex; align-items: center; gap: 9px; font-weight: 700; font-size: 15px">'
           f'<span style="font-size: 17px">🦊</span>Kitsune Cards</span>{esc}</div>')''',
              '''    top = (f'<div style="height: 48px; display: flex; align-items: center; justify-content: space-between; '
           f'padding: 0 16px; background: {P["ink6"]}; border-bottom: 1px solid {P["ink5"]}">'
           f'<span style="display: flex; align-items: center; gap: 9px; font-weight: 700; font-size: 15px">'
           f'<span style="font-size: 17px">🦊</span>Kitsune Cards</span>{esc}</div>')
    if movil:
        top = navbar_movil('Repasar escritura', accion=contexto_ronda('Hiragana · 1 grupo'))''', 'gen')

gen = cambiar(gen, '''def quiz(w, h, kana='あ'):''', '''def contexto_ronda(txt):
    """El mazo y cuántos grupos, a la derecha de la barra de ronda en teléfono."""
    return (f'<span style="font-size: 12px; color: {P["ink2"]}; white-space: nowrap">{txt}</span>')


def quiz(w, h, kana='あ'):''', 'gen')

# 8. Significados revela con el MISMO giro que Escribir: atrás de la hoja
#    están la lectura y el significado. El hueco reservado debajo se fue.
gen = cambiar(gen, '''    contexto = 'Unidad 1' if movil else 'Minna no Nihongo I · Unidad 1'
    if movil:''', '''    contexto = 'Minna no Nihongo I · 1 grupo'
    if movil:''', 'gen')
gen = cambiar(gen, '''           f'<span style="font-size: 17px">🦊</span>Kitsune Cards</span>{esc}</div>')

    if revelado:''', '''           f'<span style="font-size: 17px">🦊</span>Kitsune Cards</span>{esc}</div>')
    if movil:
        top = navbar_movil('Repasar significados', accion=contexto_ronda(contexto))

    if revelado:''', 'gen')
gen = cambiar(gen, '''    stage = (f'<div style="position: absolute; left: 0; right: 0; top: 48px; bottom: {barH}px; '
             f'display: flex; flex-direction: column; align-items: center; justify-content: center; '
             f'gap: {12 if movil else 18}px">'
             f'{hoja_quiz("けんきゅうしゃ", lado, disponible, 44 if movil else 80)}{slot}'
             f'{"" if revelado else pista_tocar(movil)}{carta_n_de_m("carta 4 de 30")}</div>')''',
              '''    frente = hoja_quiz("けんきゅうしゃ", lado, disponible, 44 if movil else 80)
    if revelado:
        # El dorso mide EXACTAMENTE lo que la hoja del frente -la hoja queda
        # debajo, invisible, y le da el ancho-, centrado sobre el eje del giro.
        lectura = 46 if movil else 88
        signif = 21 if movil else 32
        dorso = (f'<div style="position: absolute; left: 0; right: 0; top: 50%; transform: translateY(-50%); '
                 f'background: {P["papel"]}; border-radius: 3px; box-shadow: {P["sombraHoja"]}; '
                 f'padding: 16px 20px; display: flex; flex-direction: column; align-items: center; gap: 14px">'
                 f'<span style="font-family: {MONO}; font-size: {lectura}px; line-height: 1.1; '
                 f'color: {P["sumi"]}">kenkyuusha</span>'
                 f'<span style="font-size: {signif}px; line-height: 1.25; color: #32674E; text-align: center">'
                 f'Investigador/a; estudioso/a</span></div>')
        frente = (f'<div style="position: relative"><div style="visibility: hidden">{frente}</div>'
                  f'{dorso}</div>')
    stage = (f'<div style="position: absolute; left: 0; right: 0; top: 48px; bottom: {barH}px; '
             f'display: flex; flex-direction: column; align-items: center; justify-content: center; '
             f'gap: {12 if movil else 18}px">'
             f'{frente}'
             f'{"" if revelado else pista_tocar(movil)}{carta_n_de_m("carta 4 de 30")}</div>')''', 'gen')

# 9. «Renombrar» en teléfono: el lápiz, sin marco y de alto completo.
gen = gen.replace("""accion=boton('✎', h=30, fs=13)""", """accion=accion_barra(lapiz(15))""")

# 10. La barra de Ajustes ya no se arma aparte: es la de siempre, con el
#     engranaje apretado.
gen = cambiar(gen, '''    return topbar('')[:-6] + eng + '</div>\'''', '''    return topbar('', ajustes=activo)''', 'gen')

# 11. Mazos: 3 mazos incluidos, 833 cartas.
gen = cambiar(gen, '''    cab = seclab("冊", "3 mazos · 384 cartas", boton("+ Nuevo mazo", "primario", h=26, fs=12))''',
              '''    cab = seclab("冊", "3 mazos · 833 cartas", boton("+ Nuevo mazo", "primario", h=26, fs=12))''', 'gen')

GEN.write_text(gen, encoding='utf-8')
print('listo')
