# -*- coding: utf-8 -*-
"""Modales, animaciones, tokens, y el armado del canvas."""
import io, json
from lib import (P, tema, UI, MINCHO, KANA, MONO, PAUTA, page, topbar, navbar_movil, tabbar, _titulo_modal, fila_carta, filos_swipe,
                 boton, campo, seclab, switch, tarjeta_grupo, hoja_quiz, celda_genko, modal)
from datos import PALABRAS, EXPRESIONES, GRUPOS_MINNA
import gen
from gen import (emitir, marco, practica, mazos, grupos, cartas, quiz, significados,
                 stats, ajustes, acerca, BOARDS)

D = (1440, 900)
M = (390, 844)


def velo(w, h, fondo, contenido):
    return marco(w, h, fondo + contenido)


def fondo_cartas(w, h):
    return cartas(w, h).replace('<div class="f" style="width: %dpx; height: %dpx">' % (w, h), '').rsplit('</div>', 1)[0]


# ---------------------------------------------------------------- MODALES
def mod_crear(w, h):
    cuerpo = (f'<div style="display: flex; flex-direction: column; gap: 12px">'
              f'{campo("Nombre", "Minna no Nihongo II", foco=True)}'
              f'<div style="display: flex; justify-content: flex-end; gap: 8px">'
              f'{boton("Cancelar")}{boton("Crear", "primario")}</div></div>')
    return velo(w, h, fondo_cartas(w, h), modal('新 · Nuevo mazo', cuerpo, 420, w))


def mod_renombrar(w, h):
    cuerpo = (f'<div style="display: flex; flex-direction: column; gap: 12px">'
              f'{campo("Nombre", "Unidad 1", foco=True)}'
              f'<div style="display: flex; justify-content: flex-end; gap: 8px">'
              f'{boton("Cancelar")}{boton("Guardar", "primario")}</div></div>')
    return velo(w, h, fondo_cartas(w, h), modal('改 · Renombrar grupo', cuerpo, 420, w))


def mod_borrar(w, h):
    cuerpo = (f'<div style="display: flex; flex-direction: column; gap: 14px">'
              f'<span style="font-size: 14px; color: {P["ink2"]}; line-height: 1.55">'
              f'Se va a borrar <b style="color: {P["ink0"]}">«Unidad 1»</b> y sus '
              f'<b style="color: {P["ink0"]}">30 cartas</b>. No se puede deshacer.</span>'
              f'<div style="display: flex; justify-content: flex-end; gap: 8px">'
              f'{boton("Cancelar")}{boton("Borrar el grupo", "peligro")}</div></div>')
    return velo(w, h, fondo_cartas(w, h), modal('削 · ¿Borrar el grupo?', cuerpo, 460, w, destructivo=True))


def mod_editar(w, h):
    movil = w < 600
    cuerpo = (f'<div style="display: flex; flex-direction: column; gap: 12px">'
              f'{campo("Kana", "けんきゅうしゃ", foco=True)}'
              f'{campo("Romaji", "kenkyuusha")}'
              f'<div style="display: flex; gap: 8px">{boton("あ Hiragana", h=30, fs=13, crecer=True)}'
              f'{boton("ア Katakana", h=30, fs=13, crecer=True)}</div>'
              f'{campo("Significado", "Investigador")}'
              f'<span style="font-size: 12px; color: {P["ink3"]}">'
              f'El romaji se completa solo desde el kana. Editalo si hace falta.</span>'
              f'<div style="display: flex; justify-content: flex-end; gap: 8px">'
              f'{boton("Cancelar")}{boton("Guardar", "primario")}</div></div>')
    return velo(w, h, fondo_cartas(w, h), modal('編 · Editar palabra', cuerpo, 460, w))


def mod_mover(w, h):
    filas = ''
    for i, (nombre, n) in enumerate(GRUPOS_MINNA):
        on = i == 2
        bg = f'background: {P["ink5"]}; ' if on else ''
        punto = (f'<span style="width: 14px; height: 14px; border-radius: 50%; border: 1px solid '
                 f'{P["verde"] if on else P["ink4"]}; display: grid; place-items: center">'
                 + (f'<span style="width: 7px; height: 7px; border-radius: 50%; background: {P["verde"]}"></span>' if on else '')
                 + '</span>')
        filas += (f'<div style="{bg}display: flex; align-items: center; gap: 10px; padding: 8px 10px; '
                  f'border-radius: 7px">{punto}'
                  f'<span style="flex: 1; font-size: 13px">{nombre}</span>'
                  f'<span style="font-size: 11px; color: {P["ink3"]}">{n}</span></div>')
    cuerpo = (f'<div style="display: flex; flex-direction: column; gap: 10px">'
              f'<span style="font-size: 13px; color: {P["ink2"]}">Mover '
              f'<b style="color: {P["ink0"]}">けんきゅうしゃ</b> a:</span>'
              f'<div style="display: flex; flex-direction: column; gap: 2px">{filas}</div>'
              f'<div style="display: flex; justify-content: flex-end; gap: 8px">'
              f'{boton("Cancelar")}{boton("Mover", "primario")}</div></div>')
    return velo(w, h, fondo_cartas(w, h), modal('移 · Mover palabra', cuerpo, 440, w))


def mod_dict(w, h):
    """El buscador, con la estructura de fila que ya tiene la app: arriba kana,
    kanji, romaji y el botón de agregar; abajo el significado y la categoría.
    Dos líneas por resultado, que es lo que lo hace legible en un teléfono: en
    cuatro columnas los glosas se parten en tres renglones cada uno."""
    movil = w < 600
    # resultados reales de buscar «pescado»
    res = [('さかな', '魚', 'sakana', 'pescado', 'sustantivo'),
           ('りょうし', '漁師', 'ryoushi', 'pescador', 'sustantivo'),
           ('ぎょみん', '漁民', 'gyomin', 'pescadores', 'sustantivo'),
           ('せんぎょ', '鮮魚', 'sengyo', 'pescado fresco', 'sustantivo'),
           ('とる', '捕る', 'toru', 'atrapar (pescado)', 'verbo'),
           ('ぎょにく', '魚肉', 'gyoniku', 'carne de pescado', 'sustantivo'),
           ('さかなや', '魚屋', 'sakanaya', 'vendedor de pescados', 'sustantivo'),
           ('さんまい', '三枚', 'sanmai', 'fileteando (un pescado)', 'sustantivo')]
    if not movil:
        res = res + [('さしみ', '刺身', 'sashimi', 'pescado crudo en rajas', 'sustantivo'),
                     ('おろす', '下ろす', 'orosu', 'cortar en filetes', 'verbo')]

    filas = ''
    for i, (kana, kanji, rom, glosa, pos) in enumerate(res):
        borde = f'border-top: 1px solid {P["ink5"]}; ' if i else ''
        filas += (f'<div style="{borde}padding: 10px 14px; display: flex; flex-direction: column; gap: 2px">'
                  f'<span style="display: flex; align-items: center; gap: 10px">'
                  f'<span style="font-family: {KANA}; font-size: 16px; color: {P["ink0"]}">{kana}</span>'
                  f'<span style="font-family: {KANA}; font-size: 15px; color: {P["ink3"]}">{kanji}</span>'
                  f'<span style="font-family: {MONO}; font-size: 13px; color: {P["ink2"]}; '
                  f'flex: 1; min-width: 0">{rom}</span>'
                  f'{boton("Agregar", "primario", h=30, fs=13)}</span>'
                  f'<span style="display: flex; align-items: baseline; gap: 10px">'
                  f'<span style="flex: 1; min-width: 0; font-size: 13.5px; color: {P["ink2"]}">{glosa}</span>'
                  f'<span style="font-size: 11.5px; font-style: italic; color: {P["ink3"]}; '
                  f'flex: none">{pos}</span></span></div>')

    # El rótulo va ADENTRO del campo, como el resto de los campos de la app:
    # así no hace falta una etiqueta encima y el campo dice solo qué es. El
    # contador de resultados se queda a la derecha, del otro lado del texto.
    busca = (f'<div style="padding: 12px 14px">'
             f'<span style="display: flex; align-items: center; gap: 10px; height: 40px; '
             f'padding: 0 14px; border-radius: 8px; background: {P["papel"]}; '
             f'border: 1.5px solid {P["sumi"]}; box-shadow: 0 0 0 3px rgba(196,64,46,.22)">'
             f'<span style="font-size: 9px; letter-spacing: .06em; text-transform: uppercase; '
             f'color: {P["sumiDim"]}; flex: none">Buscar</span>'
             f'<span style="flex: 1; min-width: 0; font-size: 16px; color: {P["sumi"]}">pescado</span>'
             f'<span style="font-family: {MONO}; font-size: 12px; color: {P["sumiDim"]}; '
             f'flex: none">30</span></span></div>')

    # El pie se queda pegado abajo con su botón de cerrar, y la ✕ vive arriba
    # en el encabezado: dos salidas, la de alcance del pulgar y la de siempre.
    pie = (f'<div style="padding: 11px 14px; border-top: 1px solid {P["ink5"]}; '
           f'background: {P["ink6"]}; display: flex; align-items: center; gap: 12px">'
           f'<span style="flex: 1; min-width: 0; font-size: 11.5px; line-height: 1.5; '
           f'color: {P["ink3"]}">Se agrega al grupo '
           f'<b style="color: {P["ink0"]}; font-weight: 600">Unidad 1</b>. '
           f'Podés editar kana, romaji y significado después.</span>'
           f'{boton("Cerrar", h=30, fs=13)}</div>')

    if movil:
        # A pantalla completa, con su propio encabezado: el buscador se come la
        # pantalla entera, así que la barra de la pantalla de atrás no sirve de
        # nada y el título tiene que decir dónde estás parado.
        cab = (f'<div style="display: flex; align-items: center; justify-content: space-between; '
               f'gap: 10px; padding: 13px 14px; background: {P["ink6"]}; '
               f'border-bottom: 1px solid {P["ink5"]}">{_titulo_modal("辞 · Diccionario")}'
               f'<span style="color: {P["ink3"]}; font-size: 16px; flex: none">✕</span></div>')
        cont = (f'<div style="position: absolute; inset: 0; background: {P["ink7"]}; '
                f'display: flex; flex-direction: column">'
                f'{cab}{busca}<div style="flex: 1; overflow: hidden">{filas}</div>{pie}</div>')
        return velo(w, h, fondo_cartas(w, h), cont)

    cuerpo = (f'<div style="margin: -16px">{busca}'
              f'<div style="border-top: 1px solid {P["ink5"]}">{filas}</div>{pie}</div>')
    return velo(w, h, fondo_cartas(w, h), modal('辞 · Diccionario', cuerpo, 720, w))


# ---------------------------------------------------------------- ANIMACIONES
def anim_giro(w, h):
    """El giro del revelar, cuadro a cuadro con la curva real.

    Gira sobre el eje X y SIN perspectiva, así que lo que se ve es la hoja
    aplastándose en vertical sobre su centro: el alto proyectado es |cos θ|.
    θ sale de la curva de la app, cubic-bezier(0.4, 0.2, 0.6, 0.8) en 380 ms,
    resuelta acá mismo para cada cuadro.
    """
    import math

    def bezier(t, p1x=0.4, p1y=0.2, p2x=0.6, p2y=0.8):
        # x(s) = t por bisección, después y(s).
        lo, hi = 0.0, 1.0
        for _ in range(60):
            s = (lo + hi) / 2
            x = 3 * (1 - s) ** 2 * s * p1x + 3 * (1 - s) * s ** 2 * p2x + s ** 3
            lo, hi = (s, hi) if x < t else (lo, s)
        s = (lo + hi) / 2
        return 3 * (1 - s) ** 2 * s * p1y + 3 * (1 - s) * s ** 2 * p2y + s ** 3

    cuadros = []
    for ms in [0, 95, 160, 190, 220, 285, 380]:
        ang = 180 * bezier(ms / 380)
        esc = abs(math.cos(math.radians(ang)))
        frente = ang < 90
        rot = {0: 'reposo', 380: '380 ms · revelado'}.get(ms, f'{ms} ms')
        if 88 <= ang <= 92:
            rot += ' · canto'
        if frente:
            contenido = (f'<span style="font-family: {MINCHO}; font-size: 64px; color: {P["sumi"]}; '
                         f'line-height: 1">あ</span>')
        else:
            contenido = (f'<span style="font-family: {MONO}; font-size: 26px; color: {P["sumi"]}; line-height: 1">a</span>')
        cuadros.append(
            f'<div style="display: flex; flex-direction: column; align-items: center; gap: 8px">'
            f'<div style="width: 130px; height: 130px; display: grid; place-items: center">'
            f'<div style="width: 130px; height: 130px; background: {P["papel"]}; border-radius: 3px; '
            f'display: flex; flex-direction: column; align-items: center; justify-content: center; '
            f'transform: scaleY({esc:.3f}); box-shadow: {P["sombraCuadro"]}; overflow: hidden">'
            f'{contenido if esc > 0.12 else ""}</div></div>'
            f'<span style="font-family: {MONO}; font-size: 10px; color: {P["ink3"]}">{rot}</span>'
            f'<span style="font-family: {MONO}; font-size: 10px; color: {P["ink4"]}">{ang:.0f}°</span></div>')
    tira = f'<div style="display: flex; gap: 22px; align-items: flex-start">{"".join(cuadros)}</div>'

    def p(t):
        return f'<p style="margin: 0; font-size: 12.5px; color: {P["ink2"]}; max-width: 82ch; line-height: 1.6">{t}</p>'

    b_ = lambda t: f'<b style="color: {P["ink0"]}">{t}</b>'
    nota = (p(f'La hoja gira {b_("sobre el eje X")} -cae hacia adelante y sube por atrás- y el dorso es la misma '
              f'hoja con la lectura y el significado. Es el revelar de {b_("las dos rondas")}: Escribir y '
              f'Significados usan el mismo componente.')
            + p(f'{b_("Sin perspectiva")}: con perspectiva el borde que viene hacia la cámara se mueve más que el '
                f'que se aleja y la cara se corre. Sin ella el giro es un aplastado parejo sobre el centro. '
                f'{b_("380 ms")} con una curva casi lineal en el medio, cubic-bezier(0.4, 0.2, 0.6, 0.8): el tramo '
                f'de canto, que es donde cambia la cara, pasa en seis cuadros y no en cuatro.')
            + p(f'La carta vive {b_("siempre en su propia capa")} de GPU. Con el escalado de Windows al 125% la '
                f'promoción a capa al arrancar el giro la corría un píxel de costado. Y cada carta nueva entra '
                f'{b_("de frente y sin animar")}: si no, al calificar una revelada, la vuelta mostraba la '
                f'respuesta de la siguiente.'))
    cuerpo = (f'<div style="padding: 32px; display: flex; flex-direction: column; gap: 22px">'
              f'<div style="display: flex; flex-direction: column; gap: 6px">'
              f'<span style="font-family: {MINCHO}; font-size: 22px">翻 · Revelar</span>'
              f'<span style="font-size: 12px; color: {P["ink3"]}">Escribir y Significados · 380 ms</span></div>'
              f'{tira}{nota}</div>')
    return marco(w, h, cuerpo)


def anim_revelar(w, h):
    """El revelar de Significados: 180 ms, el significado sube y entra."""
    pasos = [(0, 0.0, 10, 'oculto'), (60, 0.25, 6, '60 ms'),
             (120, 0.70, 2, '120 ms'), (180, 1.0, 0, '180 ms · revelado')]
    cuadros = ''
    for ms, op, dy, rot in pasos:
        # La misma celda que la hoja de verdad, no una copia a mano: la copia
        # traía el `border-left: none` que descentraba la cruz.
        celdas = ''.join(celda_genko(k, 34, i == 0, True, 21)
                         for i, k in enumerate('けんきゅうしゃ'))
        hoja = (f'<div style="display: flex; background: {P["papel"]}; border-radius: 3px; '
                f'overflow: hidden; box-shadow: {P["sombraHoja"]}">{celdas}</div>')
        cuadros += (f'<div style="display: flex; flex-direction: column; align-items: center; gap: 10px">'
                    f'<div style="width: 250px; height: 104px; display: flex; flex-direction: column; '
                    f'align-items: center; gap: 8px; padding-top: 4px">{hoja}'
                    f'<span style="display: flex; flex-direction: column; align-items: center; gap: 1px; '
                    f'opacity: {op}; transform: translateY({dy}px)">'
                    f'<span style="font-family: {MONO}; font-size: 11px; color: {P["ink2"]}">kenkyuusha</span>'
                    f'<span style="font-size: 18px; color: {P["ink0"]}">Investigador</span></span></div>'
                    f'<span style="font-family: {MONO}; font-size: 10px; color: {P["ink3"]}">{rot}</span>'
                    f'</div>')
    tira = f'<div style="display: flex; gap: 22px; align-items: flex-start">{cuadros}</div>'

    nota = (f'<p style="margin: 0; font-size: 12.5px; color: {P["ink2"]}; max-width: 76ch; line-height: 1.6">'
            f'La hoja <b style="color: {P["ink0"]}">no gira</b>. El giro de '
            f'<span style="font-family: {MINCHO}">翻</span> es del quiz, donde el kana se va '
            f'y entra la respuesta en su lugar; acá la palabra se queda y el significado aparece debajo, '
            f'porque lo que estás tratando de unir son las dos cosas a la vez.</p>'
            f'<p style="margin: 0; font-size: 12.5px; color: {P["ink2"]}; max-width: 76ch; line-height: 1.6">'
            f'Sube 10px y entra en opacidad, en <b style="color: {P["ink0"]}">180 ms</b> — menos de la mitad '
            f'que el giro, porque no hay nada que darse vuelta y en un repaso vas a apretar Revelar decenas '
            f'de veces por ronda. El hueco donde cae ya estaba reservado antes de revelar, así que la hoja '
            f'no se mueve ni un pixel: lo único que cambia es lo que aparece adentro del hueco.</p>'
            f'<p style="margin: 0; font-size: 12.5px; color: {P["ink2"]}; max-width: 76ch; line-height: 1.6">'
            f'Y es un interruptor: <b style="color: {P["ink0"]}">Ocultar</b> corre los mismos 180 ms al revés, '
            f'que es lo que deja taparse la respuesta y volver a probar sin salir de la carta.</p>')
    cuerpo = (f'<div style="padding: 32px; display: flex; flex-direction: column; gap: 22px">'
              f'<div style="display: flex; flex-direction: column; gap: 6px">'
              f'<span style="font-family: {MINCHO}; font-size: 22px">露 · Revelar el significado</span>'
              f'<span style="font-size: 12px; color: {P["ink3"]}">Significados · 180 ms</span></div>'
              f'{tira}{nota}</div>')
    return marco(w, h, cuerpo)


def anim_swipe(w, h):
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


def anim_error(w, h):
    """El flash de respuesta incorrecta y la entrada de los modales."""
    def hoja(borde, sombra, txt_color):
        return (f'<div style="width: 150px; height: 150px; background: {P["papel"]}; border-radius: 3px; '
                f'display: grid; place-items: center; border: 2px solid {borde}; box-shadow: {sombra}; '
                f'background-image: repeating-linear-gradient(to bottom, rgba(196,64,46,.12) 0 1px, transparent 1px 30px)">'
                f'<span style="font-family: {MINCHO}; font-size: 64px; color: {txt_color}; line-height: 1">ぬ</span></div>')
    pasos = [('rgba(25,23,19,.14)', 'none', P['sumi'], 'reposo'),
             (P['shu'], f'0 0 0 6px rgba(196,64,46,.28)', P['shu'], '0 ms · error'),
             (P['shu'], f'0 0 0 3px rgba(196,64,46,.14)', P['shu'], '300 ms'),
             ('rgba(25,23,19,.14)', 'none', P['sumi'], '600 ms')]
    tira = ''
    for b, s, c, lab in pasos:
        tira += (f'<div style="display: flex; flex-direction: column; gap: 8px; align-items: center">'
                 f'{hoja(b, s, c)}'
                 f'<span style="font-family: {MONO}; font-size: 10px; color: {P["ink3"]}">{lab}</span></div>')

    modales = ''
    for esc, op, lab in [(0.96, 0.0, '0 ms'), (0.99, 0.6, '100 ms'), (1.0, 1.0, '200 ms')]:
        modales += (f'<div style="display: flex; flex-direction: column; gap: 8px; align-items: center">'
                    f'<div style="width: 190px; height: 110px; display: grid; place-items: center; '
                    f'background: rgba({P["scrimBase"]},{0.72 * op:.2f}); border-radius: 6px">'
                    f'<div style="width: 160px; background: {P["ink6"]}; border: 1px solid {P["ink4"]}; '
                    f'border-radius: 8px; padding: 10px; transform: scale({esc}); opacity: {op}">'
                    f'<span style="font-family: {MINCHO}; font-size: 12px">改 · Renombrar</span></div></div>'
                    f'<span style="font-family: {MONO}; font-size: 10px; color: {P["ink3"]}">{lab}</span></div>')

    nota = (f'<p style="margin: 0; font-size: 12.5px; color: {P["ink2"]}; max-width: 70ch; line-height: 1.6">'
            f'El error no mueve la hoja ni la sacude: le sube un filete shu y un halo que se apaga en 600 ms. '
            f'Es la tinta de corrección del profesor sobre el papel, no una alarma. La carta no avanza hasta '
            f'que la acertás, así que la marca tiene que poder repetirse sin cansar.</p>')
    cuerpo = (f'<div style="padding: 32px; display: flex; flex-direction: column; gap: 20px">'
              f'<div style="display: flex; flex-direction: column; gap: 6px">'
              f'<span style="font-family: {MINCHO}; font-size: 22px">朱 · Corrección y entrada</span>'
              f'<span style="font-size: 12px; color: {P["ink3"]}">Quiz 600 ms · modales 200 ms</span></div>'
              f'<div style="display: flex; gap: 22px; flex-wrap: wrap">{tira}</div>'
              f'<div style="display: flex; gap: 22px; flex-wrap: wrap; align-items: flex-end">{modales}</div>'
              f'{nota}</div>')
    return marco(w, h, cuerpo)


# ---------------------------------------------------------------- TOKENS
def tokens(w, h):
    # La escala sale de `P` y el L* se calcula, en vez de estar copiado a
    # mano: así el tablero describe el tema en el que se está dibujando y no
    # hay una segunda copia de la paleta que se pueda desincronizar.
    def lstar(hexa):
        def lin(c):
            c = int(hexa[c:c + 2], 16) / 255
            return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
        Y = 0.2126 * lin(1) + 0.7152 * lin(3) + 0.0722 * lin(5)
        return 116 * Y ** (1 / 3) - 16 if Y > 0.008856 else 903.3 * Y

    ROLES = ['0 · texto', '1', '2 · atenuado', '3 · placeholder', '4 · borde',
             '5 · hover', '6 · superficie', '7 · fondo', '8', '9']
    INK = [(P[f'ink{i}'], rol, lstar(P[f'ink{i}'])) for i, rol in enumerate(ROLES)]
    rampa = ''
    for hexa, rol, L in INK:
        col = P['sumi'] if L > 55 else '#D6D1C4'
        rampa += (f'<div style="flex: 1; height: 76px; background: {hexa}; position: relative">'
                  f'<span style="position: absolute; left: 0; right: 0; bottom: 6px; text-align: center; '
                  f'font-family: {MONO}; font-size: 9px; color: {col}">{hexa}</span></div>')
    rampabox = (f'<div style="display: flex; border: 1px solid {P["ink4"]}; border-radius: 3px; '
                f'overflow: hidden">{rampa}</div>')

    # Cuánto se aparta el papel apagado del papel: en oscuro cae, en claro
    # sube, y en los dos casos la distancia es la que dice el rótulo.
    _d = lstar(P['papel']) - lstar(P['papelOff'])
    SW = [('紙', 'Papel', P['papel'], 'Donde vive el kana. La hoja del quiz y la columna de la tarjeta. Nada más.', P['sumi']),
          ('', 'Papel apagado', P['papelOff'],
           'El mismo papel, sin elegir. ' + P['papelOffNota'].format(d=abs(_d)),
           P['papelInk']),
          ('墨', 'Sumi', P['sumi'], 'La tinta sobre el papel. 13,7:1.', P['papel']),
          ('', 'Sumi atenuado', P['sumiDim'], 'El romaji bajo cada kana. 5,3:1 — hoy es 1,33:1.', P['papel']),
          ('朱', 'Shu', P['shu'], 'Error, la pauta del papel al 16% y el sello de la marca.', '#F7F3EA'),
          ('', 'Verde acción', P['verde'], 'Sólo el botón lleno. Misma familia de tono que la tinta.', P['verdeInk'])]
    swb = ''
    for jp, nombre, hexa, por, fg in SW:
        swb += (f'<div style="border: 1px solid {P["ink4"]}; border-radius: 3px; overflow: hidden; '
                f'background: {P["ink6"]}">'
                f'<div style="height: 74px; background: {hexa}; display: flex; align-items: flex-end; padding: 8px">'
                f'<span style="font-family: {MINCHO}; font-size: 26px; line-height: 1; color: {fg}">{jp}</span></div>'
                f'<div style="padding: 9px 10px 11px; display: flex; flex-direction: column; gap: 2px">'
                f'<span style="font-weight: 700; font-size: 13px">{nombre}</span>'
                f'<span style="font-family: {MONO}; font-size: 11px; color: {P["ink2"]}">{hexa}</span>'
                f'<span style="font-size: 11px; color: {P["ink3"]}; line-height: 1.45">{por}</span></div></div>')
    swbox = (f'<div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px">{swb}</div>')

    tipos = ''
    for fam, nombre, uso, muestra in [
            (MINCHO, 'Zen Old Mincho', 'El kana grande del quiz y los títulos', 'あ 墨と紙'),
            (UI, 'M PLUS 2', 'Toda la interfaz', 'Nueva palabra en «Unidad 1»'),
            (KANA, 'Zen Kaku Gothic New', 'El kana chico de las listas y tarjetas', 'けんきゅうしゃ'),
            (MONO, 'M PLUS 1 Code', 'Números y teclas; el romaji sale de acá', 'kenkyuusha · 67%')]:
        tipos += (f'<div style="display: flex; flex-direction: column; gap: 4px; padding: 12px 0; '
                  f'border-top: 1px solid {P["ink5"]}">'
                  f'<span style="font-family: {fam}; font-size: 26px; line-height: 1.3">{muestra}</span>'
                  f'<span style="font-size: 12px; color: {P["ink2"]}">'
                  f'<b style="color: {P["ink0"]}">{nombre}</b> — {uso}</span></div>')

    cuerpo = (f'<div style="padding: 32px; display: flex; flex-direction: column; gap: 24px">'
              f'<div style="display: flex; flex-direction: column; gap: 6px">'
              f'<span style="font-family: {MINCHO}; font-size: 26px">墨と紙 · Tokens</span>'
              f'<span style="font-size: 12.5px; color: {P["ink2"]}">La escala de tinta reemplaza el array '
              f'<span style="font-family: {MONO}">{P["arrayTema"]}</span> de theme.ts. El papel y el sumi van en '
              f'<span style="font-family: {MONO}">theme.other</span>.</span></div>'
              f'{rampabox}{swbox}'
              f'<div style="display: flex; flex-direction: column">{tipos}</div></div>')
    return marco(w, h, cuerpo)


# ---------------------------------------------------------------- armado
# 90px entre marcos de una fila. Entre filas hace falta MUCHO más: el título
# de cada fila se dibuja 250px por encima de ella, así que con menos aire el
# título caía adentro de la fila de arriba -que es justo lo que pasó-.
GAP, ROW = 90, 360
FILAS = []


def fila_de(y, titulo, items, alto):
    x = 0
    for nombre, tit, fn, (w, h) in items:
        emitir(nombre, tit, w, h, fn(w, h), x, y)
        x += w + GAP
    FILAS.append((y, titulo))
    return y + alto + ROW


def quiz_palabra_d(w, h):
    return quiz(w, h, 'けんきゅうしゃ')


def quiz_palabra_m(w, h):
    return quiz(w, h, 'けんきゅうしゃ')


FRASE = 'これわ にほんごで なんと いいますか'


def quiz_frase_d(w, h):
    return quiz(w, h, FRASE)


def quiz_frase_m(w, h):
    return quiz(w, h, FRASE)


FILAS_DEF = []
def practica_pal_d(w, h):
    return practica(w, h, palabras=True)


def practica_pal_m(w, h):
    return practica(w, h, palabras=True)


def signif_d(w, h):
    return significados(w, h)


def signif_rev_d(w, h):
    return significados(w, h, revelado=True)


def signif_m(w, h):
    return significados(w, h)


def signif_rev_m(w, h):
    return significados(w, h, revelado=True)


FILAS_DEF.append(('Escritorio · 1440×900', [
    ('Main.dc.html', 'Práctica · escritorio', practica, D),
    ('EscMazos.dc.html', 'Mazos · escritorio', mazos, D),
    ('EscGrupos.dc.html', 'Grupos · escritorio', grupos, D),
    ('EscCartas.dc.html', 'Cartas · escritorio', cartas, D),
    ('EscQuiz.dc.html', 'Quiz · escritorio', quiz, D),
    ('EscStats.dc.html', 'Estadísticas · escritorio', stats, D),
], 900))

FILAS_DEF.append(('Teléfono · 390×844', [
    ('TelPractica.dc.html', 'Práctica · teléfono', practica, M),
    ('TelMazos.dc.html', 'Mazos · teléfono', mazos, M),
    ('TelGrupos.dc.html', 'Grupos · teléfono', grupos, M),
    ('TelCartas.dc.html', 'Cartas · teléfono', cartas, M),
    ('TelQuiz.dc.html', 'Quiz · teléfono', quiz, M),
    ('TelStats.dc.html', 'Estadísticas · teléfono', stats, M),
], 844))

FILAS_DEF.append(('El quiz con una palabra y con una frase, no sólo con un kana', [
    ('EscQuizPalabra.dc.html', 'Quiz con palabra · escritorio', quiz_palabra_d, D),
    ('TelQuizPalabra.dc.html', 'Quiz con palabra · teléfono', quiz_palabra_m, M),
    ('EscQuizFrase.dc.html', 'Quiz con frase · escritorio', quiz_frase_d, D),
    ('TelQuizFrase.dc.html', 'Quiz con frase · teléfono', quiz_frase_m, M),
], 900))

FILAS_DEF.append(('Repasar el significado, sin escribir', [
    ('EscPracticaPal.dc.html', 'Práctica con palabras · escritorio', practica_pal_d, D),
    ('TelPracticaPal.dc.html', 'Práctica con palabras · teléfono', practica_pal_m, M),
    ('EscSignif.dc.html', 'Significados · escritorio', signif_d, D),
    ('EscSignifRev.dc.html', 'Significados revelado · escritorio', signif_rev_d, D),
    ('TelSignif.dc.html', 'Significados · teléfono', signif_m, M),
    ('TelSignifRev.dc.html', 'Significados revelado · teléfono', signif_rev_m, M),
], 900))

FILAS_DEF.append(('Modales · crear, renombrar, borrar', [
    ('ModCrear.dc.html', 'Nuevo mazo', mod_crear, D),
    ('ModRenombrar.dc.html', 'Renombrar grupo', mod_renombrar, D),
    ('ModBorrar.dc.html', 'Borrar grupo', mod_borrar, D),
], 900))

FILAS_DEF.append(('Modales · editar, mover, diccionario', [
    ('ModEditar.dc.html', 'Editar palabra', mod_editar, D),
    ('ModMover.dc.html', 'Mover palabra', mod_mover, D),
    ('ModDict.dc.html', 'Diccionario · escritorio', mod_dict, D),
], 900))

FILAS_DEF.append(('Modales en teléfono', [
    ('TelModDict.dc.html', 'Diccionario · teléfono', mod_dict, M),
    ('TelModEditar.dc.html', 'Editar palabra · teléfono', mod_editar, M),
    ('TelModBorrar.dc.html', 'Borrar · teléfono', mod_borrar, M),
], 844))

FILAS_DEF.append(('Animaciones', [
    ('AnimGiro.dc.html', 'Revelar · 380 ms', anim_giro, (1240, 600)),
    ('AnimRevelar.dc.html', 'Revelar el significado · 180 ms', anim_revelar, (1240, 520)),
    ('AnimSwipe.dc.html', 'Gesto de fila', anim_swipe, (1240, 620)),
], 620))

FILAS_DEF.append(('Ajustes y Acerca de', [
    ('EscAjustes.dc.html', 'Ajustes', ajustes, D),
    ('TelAjustes.dc.html', 'Ajustes · teléfono', ajustes, M),
    ('EscAcerca.dc.html', 'Acerca de', acerca, D),
    ('TelAcerca.dc.html', 'Acerca de · teléfono', acerca, M),
], 900))

FILAS_DEF.append(('Corrección, entrada y tokens', [
    ('AnimError.dc.html', 'Corrección y entrada', anim_error, (1240, 620)),
    ('Tokens.dc.html', 'Tokens', tokens, (1240, 900)),
], 900))



# Dentro de un par -la misma pantalla en los dos temas- el hueco es un tercio
# del que hay entre pantallas distintas. Es lo único que dice que esas dos son
# la misma cosa: pegadas se comparan de un vistazo, y el hueco grande de al
# lado corta antes de que empiece la pantalla siguiente.
PAR = 30


def emitir_pares(y0):
    """Dibuja cada pantalla dos veces seguidas, oscura y clara.

    Los generadores no saben de temas: leen `P[...]` cuando dibujan, así que
    alcanza con cambiar el tema entre una y otra. La clara lleva prefijo en el
    archivo para no pisar a la oscura.
    """
    y = y0
    for titulo, items, alto in FILAS_DEF:
        x = 0
        for arch, tit, fn, (w, h) in items:
            tema('oscuro')
            emitir(arch, tit, w, h, fn(w, h), x, y)
            x += w + PAR
            tema('claro')
            emitir('Cl' + arch, tit + ' · claro', w, h, fn(w, h), x, y)
            x += w + GAP
        FILAS.append((y, titulo))
        y += alto + ROW
    return y


y = emitir_pares(0)
tema('oscuro')

# ---------------------------------------------------------------- canvas.json
boards, order = {}, []
for nombre, w, h, titulo, x, yy in BOARDS:
    boards[nombre] = {'x': x, 'y': yy, 'w': w, 'h': h, 'title': titulo}
    order.append(nombre)

notas = {}
for i, (yy, txt) in enumerate(FILAS):
    notas[f'n{i}'] = {'x': 0, 'y': yy - 250, 'text': txt, 'kind': 'title1', 'maxW': 3000}

idx = {'v': 3, 'createdOnFiles': {'v': 1, 'at': '2026-09-25T00:00:00Z'},
       'title': 'Kitsune Cards · tinta y papel',
       'launch': {'view': 'canvas'}, 'pages': [],
       'boards': boards, 'order': order, 'notes': notas, 'designSystems': []}
io.open('project/canvas.json', 'w', encoding='utf-8').write(
    json.dumps(idx, ensure_ascii=False, indent=2))

print(f'{len(BOARDS)} artboards, {len(FILAS)} filas')
prev = None
for yy, txt in FILAS:
    print(f'  fila y={yy:5}  titulo en y={yy-250:5}  {txt}')
