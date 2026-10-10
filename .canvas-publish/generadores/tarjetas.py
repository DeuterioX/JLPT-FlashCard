# -*- coding: utf-8 -*-
"""Tarjetas de grupo del mismo alto: hoy contra la propuesta.

El problema, con el mazo de Minna no Nihongo: la fila estira las tarjetas al
mismo alto, pero cada hoja arranca donde termina SU título -«Pronombres y formas
de dirigirse a alguien» ocupa cuatro renglones, «Edad» uno- y «N palabras más»
aparece sólo en algunas, así que ni el arranque ni el fondo de las hojas
coinciden y las pautas no se leen como un mismo papel.

La propuesta:
  1. La tarjeta se parte en título / hoja y esas franjas son FILAS COMPARTIDAS
     de la grilla (`grid-template-rows: subgrid`): el título más alto de la fila
     define el de todas, y el primer renglón de todas las hojas cae a la misma
     altura. Con tope de dos renglones y elipsis, para que un nombre largo no
     agrande la fila entera.
  2. «N palabras más» pasa ADENTRO de la hoja, como su último renglón. Ya no hay
     un pie que tienen unas sí y otras no.

Las tarjetas se dibujan con CSS de verdad -grid y subgrid-, no con alturas
calculadas a mano: es la misma técnica que usaría la app.
"""
import io, json
from lib import P, tema, KANA, MONO, PAUTA, switch
from gen import emitir

PASO = 27          # el renglón de la hoja en la app: 1,6875rem
MAX = 6            # renglones de vista previa que trae cada grupo

# Lección 1 tal como quedó cargada. (nombre, [(kana, romaji)], total)
L1 = [
    ('Pronombres y formas de dirigirse a alguien',
     [('わたし', 'watashi'), ('わたしたち', 'watashitachi'), ('あなた', 'anata'),
      ('あのひと', 'ano hito'), ('あのかた', 'ano kata'), ('みなさん', 'minasan')], 6),
    ('Sufijos para nombres y personas',
     [('～さん', 'san'), ('～ちゃん', 'chan'), ('～くん', 'kun'), ('～じん', 'jin')], 4),
    ('Profesiones y ocupaciones',
     [('せんせい', 'sensei'), ('きょうし', 'kyoushi'), ('がくせい', 'gakusei'),
      ('かいしゃいん', 'kaishain'), ('しゃいん', 'shain'), ('ぎんこういん', 'ginkouin')], 9),
    ('Instituciones',
     [('だいがく', 'daigaku'), ('びょういん', 'byouin'), ('でんき', 'denki')], 3),
    ('Preguntas',
     [('だれ', 'dare'), ('どなた', 'donata'), ('なんさい', 'nansai'),
      ('おいくつ', 'oikutsu'), ('おなまえは？', 'onamae wa')], 5),
    ('Edad', [('～さい', 'sai')], 1),
]
ENCENDIDOS = {0, 2}


def renglon(k, r, on):
    tinta = P['sumi'] if on else P['papelInk']
    tintaR = P['sumiDim'] if on else P['papelInkDim']
    corte = 'max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap'
    return (f'<span style="height: {PASO}px; flex: none; display: flex; flex-direction: column; '
            f'align-items: center; justify-content: center">'
            f'<span style="font-family: {KANA}; font-weight: 500; font-size: 14px; line-height: 1.2; '
            f'color: {tinta}; {corte}">{k}</span>'
            f'<span style="font-family: {MONO}; font-size: 9px; line-height: 1.2; color: {tintaR}; {corte}">{r}</span>'
            f'</span>')


def mas_renglon(n, on):
    """«+3 más» como un renglón más de la hoja, en la letra del romaji."""
    tinta = P['sumiDim'] if on else P['papelInkDim']
    return (f'<span style="height: {PASO}px; flex: none; display: flex; align-items: center; '
            f'justify-content: center; font-family: {MONO}; font-size: 10px; color: {tinta}">'
            f'+{n} más</span>')


def hoja(filas, on, extra='', crecer=False):
    papel = P['papel'] if on else P['papelOff']
    return (f'<span style="{"flex: 1; " if crecer else ""}min-height: 0; border-radius: 3px; background-color: {papel}; '
            f'background-image: {PAUTA.format(PASO)}; background-origin: content-box; '
            f'padding-block: 5px; display: flex; flex-direction: column; overflow: hidden">'
            f'{"".join(renglon(k, r, on) for k, r in filas)}{extra}</span>')


def titulo(nombre, on, tope=None):
    clamp = (f'display: -webkit-box; -webkit-box-orient: vertical; -webkit-line-clamp: {tope}; '
             f'overflow: hidden;' if tope else '')
    return (f'<span style="display: flex; align-items: flex-start; justify-content: space-between; '
            f'gap: 6px; padding: 0 2px">'
            f'<span title="{nombre}" style="font-family: {KANA}; font-size: 11.5px; line-height: 1.4; '
            f'font-weight: 500; min-width: 0; {clamp} color: {P["ink0"] if on else P["ink2"]}">{nombre}</span>'
            f'<span style="flex: none; padding-top: 2px">{switch(on)}</span></span>')


CAJA = (lambda: f'background: {P["ink6"]}; border: 1px solid {P["ink5"]}; border-radius: 6px; padding: 8px 6px')


def tarjeta_hoy(nombre, filas, total, on):
    """La de hoy: título entero, hoja que crece, y el pie sólo si sobran."""
    pie = ''
    if total > len(filas):
        n = total - len(filas)
        pie = (f'<span style="text-align: center; font-size: 12px; color: {P["ink0"] if on else P["ink3"]}">'
               f'{n} palabra{"s" if n > 1 else ""} más</span>')
    return (f'<div style="{CAJA()}; display: flex; flex-direction: column; gap: 6px">'
            f'{titulo(nombre, on)}'
            f'{hoja(filas, on, crecer=True)}'
            f'{pie}</div>')


def tarjeta_nueva(nombre, filas, total, on):
    """La propuesta: dos filas compartidas con las vecinas, y el «más» adentro."""
    n = total - len(filas)
    return (f'<div style="{CAJA()}; display: grid; grid-row: span 2; grid-template-rows: subgrid; '
            f'row-gap: 6px">'
            f'{titulo(nombre, on, tope=2)}'
            f'{hoja(filas, on, mas_renglon(n, on) if n > 0 else "")}</div>')


def grilla(tarjeta, cols, datos, filas_de_tarjeta=1):
    filas = (f'grid-template-rows: repeat({(len(datos) + cols - 1) // cols * 2}, auto); '
             if filas_de_tarjeta == 2 else 'grid-auto-rows: auto; ')
    items = ''.join(tarjeta(n, f[:MAX - (1 if t > MAX and tarjeta is tarjeta_nueva else 0)], t, i in ENCENDIDOS)
                    for i, (n, f, t) in enumerate(datos))
    return (f'<div style="display: grid; grid-template-columns: repeat({cols}, minmax(0, 1fr)); '
            f'{filas}gap: 10px; column-gap: 10px">{items}</div>')


def rotulo(txt, nota):
    return (f'<div style="display: flex; align-items: baseline; gap: 10px; margin-bottom: 10px">'
            f'<span style="font-family: {MONO}; font-size: 10px; letter-spacing: .08em; '
            f'text-transform: uppercase; color: {P["shu"]}">{txt}</span>'
            f'<span style="font-size: 11.5px; color: {P["ink3"]}">{nota}</span></div>')


def regla(y_txt):
    """Una línea punteada que cruza la fila a la altura del primer renglón."""
    return y_txt


def lamina(w, h):
    cab = (f'<div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 22px">'
           f'<span style="font-size: 19px; font-weight: 700; color: {P["ink0"]}">'
           f'Tarjetas de grupo del mismo alto</span>'
           f'<span style="font-size: 12.5px; color: {P["ink2"]}; max-width: 900px; line-height: 1.6">'
           f'Hoy cada hoja arranca donde termina su título y algunas pierden un renglón por el pie '
           f'«N palabras más», así que las pautas de una misma fila quedan a alturas distintas. '
           f'La propuesta comparte la fila del título entre las tarjetas vecinas '
           f'(<span style="font-family: {MONO}">subgrid</span>), lo topea en dos renglones y pasa '
           f'el «más» adentro de la hoja como su último renglón.</span></div>')

    esc = (f'<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 30px">'
           f'<div>{rotulo("Hoy", "cada hoja arranca a otra altura")}{grilla(tarjeta_hoy, 6, L1)}</div>'
           f'<div>{rotulo("Propuesta", "título compartido y topeado en dos renglones; el «más» va en la hoja")}'
           f'{grilla(tarjeta_nueva, 6, L1, 2)}</div></div>')

    tel = (f'<div style="width: 360px; flex: none; display: flex; flex-direction: column; gap: 30px">'
           f'<div>{rotulo("Hoy · teléfono", "3 columnas")}{grilla(tarjeta_hoy, 3, L1)}</div>'
           f'<div>{rotulo("Propuesta · teléfono", "")}{grilla(tarjeta_nueva, 3, L1, 2)}</div></div>')

    cuerpo = (f'<div style="padding: 26px 28px">{cab}'
              f'<div style="display: flex; gap: 48px; align-items: flex-start">{esc}{tel}</div></div>')
    return f'<div class="f" style="width: {w}px; height: {h}px">{cuerpo}</div>'


W, H = 1640, 1240
Y = 14700
nuevos = {}
for nombre, tit, t, x in [('TarjetasAlto', 'Tarjetas del mismo alto', 'oscuro', 0),
                          ('ClTarjetasAlto', 'Tarjetas del mismo alto · claro', 'claro', W + 30)]:
    tema(t)
    emitir(f'{nombre}.dc.html', tit, W, H, lamina(W, H), x, Y)
    nuevos[f'{nombre}.dc.html'] = {'x': x, 'y': Y, 'w': W, 'h': H, 'title': tit}
tema('oscuro')
json.dump(nuevos, io.open('nuevos4.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('\n'.join(nuevos))
