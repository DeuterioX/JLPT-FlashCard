# -*- coding: utf-8 -*-
"""Tres direcciones para las tarjetas de grupo con nombres largos.

A · Sin interruptor: el nombre ocupa todo el ancho de la franja; el estado lo
    dicen el papel y una marca en la esquina de la hoja.
B · Hoja primero: la hoja arriba, de alto fijo, y el nombre abajo como rótulo.
C · Lista: para vocabulario, una fila por grupo en vez de una tarjeta.
"""
import io, json
from lib import P, tema, KANA, MONO, PAUTA, switch, seclab
from gen import emitir

PASO = 27
FILAS = 5

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
ON = {0, 2}

CHECK = ('M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02'
         'L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425z')
CORTE = 'min-width: 0; max-width: 100%; overflow: hidden; text-overflow: ellipsis; white-space: nowrap'


def tintas(on):
    return (P['papel'] if on else P['papelOff'], P['sumi'] if on else P['papelInk'],
            P['sumiDim'] if on else P['papelInkDim'])


def renglon(k, r, on, alto=PASO):
    _, t, tr = tintas(on)
    return (f'<span style="height: {alto}px; flex: none; display: flex; flex-direction: column; '
            f'align-items: center; justify-content: center; padding: 0 6px">'
            f'<span style="font-family: {KANA}; font-weight: 500; font-size: 14px; line-height: 1.2; '
            f'color: {t}; {CORTE}">{k}</span>'
            f'<span style="font-family: {MONO}; font-size: 9px; line-height: 1.2; color: {tr}; {CORTE}">{r}</span>'
            f'</span>')


def hoja(filas, total, on, marca=False):
    """Alto fijo de FILAS renglones; si sobran, el último dice cuántas faltan."""
    papel, _, tr = tintas(on)
    vis = filas if total <= FILAS else filas[:FILAS - 1]
    resto = total - len(vis)
    mas = (f'<span style="height: {PASO}px; flex: none; display: flex; align-items: center; '
           f'justify-content: center; font-family: {MONO}; font-size: 10px; color: {tr}">+{resto} más</span>'
           if resto > 0 else '')
    sello = ''
    if marca and on:
        sello = (f'<span style="position: absolute; bottom: 6px; right: 6px; width: 18px; height: 18px; '
                 f'border-radius: 50%; background: {P["verde"]}; display: grid; place-items: center">'
                 f'<svg viewBox="0 0 16 16" fill="{P["verdeInk"]}" style="width: 12px; height: 12px">'
                 f'<path d="{CHECK}"/></svg></span>')
    return (f'<span style="position: relative; height: {FILAS * PASO + 10}px; flex: none; border-radius: 3px; '
            f'background-color: {papel}; background-image: {PAUTA.format(PASO)}; '
            f'background-origin: content-box; padding-block: 5px; display: flex; flex-direction: column; '
            f'overflow: hidden">{"".join(renglon(k, r, on) for k, r in vis)}{mas}{sello}</span>')


def caja(on, extra=''):
    borde = P['verde'] if on else P['ink5']
    return (f'background: {P["ink6"]}; border: 1px solid {borde}; border-radius: 6px; {extra}')


# ------------------------------------------------------------------ A

def tarjeta_a(nombre, filas, total, on):
    """Sin interruptor. La franja de arriba es del nombre, de punta a punta, con
    alto fijo de dos renglones: entra «Pronombres y formas de dirigirse a
    alguien» en escritorio sin cortar. El estado: borde y marca en jade, papel
    crema o gris."""
    col = P['ink0'] if on else P['ink2']
    return (f'<div style="{caja(on, "padding: 6px; display: flex; flex-direction: column; gap: 6px")}">'
            f'<span title="{nombre}" style="height: 32px; padding: 0 2px; font-size: 11.5px; line-height: 1.4; '
            f'font-weight: 500; color: {col}; display: -webkit-box; -webkit-box-orient: vertical; '
            f'-webkit-line-clamp: 2; overflow: hidden">{nombre}</span>'
            f'{hoja(filas, total, on, marca=True)}</div>')


# ------------------------------------------------------------------ B

def tarjeta_b(nombre, filas, total, on):
    """Hoja primero, de alto fijo, así todas las hojas de la pantalla arrancan y
    terminan a la misma altura -no sólo las de una fila-. El nombre queda abajo
    como el rótulo de una ficha, a todo el ancho y con el lugar que necesite;
    lo desparejo es el pie, que es donde menos se nota. Sin interruptor, como
    A: si no, en teléfono parte el nombre en una palabra por renglón."""
    col = P['ink0'] if on else P['ink2']
    return (f'<div style="{caja(on, "padding: 6px; display: flex; flex-direction: column; gap: 8px")}">'
            f'{hoja(filas, total, on, marca=True)}'
            f'<span style="padding: 0 2px 2px; font-size: 11.5px; line-height: 1.4; font-weight: 500; '
            f'color: {col}; text-wrap: pretty">{nombre}</span></div>')


# ------------------------------------------------------------------ C

def fila_c(nombre, filas, total, on, compacta=False):
    """Una fila por grupo. El nombre tiene una columna entera y no compite con
    nada; las palabras van en una tira de papel, en un renglón, con el total al
    final. Lo que se pierde es ver las palabras en columna como en el kana."""
    papel, t, tr = tintas(on)
    col = P['ink0'] if on else P['ink2']
    kanas = '<span style="color: ' + tr + '; padding: 0 6px">・</span>'
    tira = kanas.join(f'<span style="font-family: {KANA}; font-weight: 500; color: {t}">{k}</span>'
                      for k, _ in filas[:6])
    nombre_w = '100%' if compacta else '240px'
    cuerpo = (f'<span style="flex: none; width: {nombre_w}; font-size: 12.5px; line-height: 1.4; font-weight: 500; '
              f'color: {col}">{nombre}</span>'
              f'<span style="flex: 1; min-width: 0; height: 32px; border-radius: 3px; background: {papel}; '
              f'display: flex; align-items: center; padding: 0 10px; font-size: 14px; {CORTE}; '
              f'display: block; line-height: 32px">{tira}</span>')
    if compacta:
        cuerpo = (f'<span style="display: flex; flex-direction: column; gap: 6px; flex: 1; min-width: 0">'
                  f'{cuerpo}</span>')
    return (f'<div style="display: flex; align-items: center; gap: 14px; padding: 10px 12px; '
            f'border-top: 1px solid {P["ink5"]}">'
            f'{switch(on)}{cuerpo}'
            f'<span style="flex: none; width: 22px; text-align: right; font-family: {MONO}; font-size: 11px; '
            f'color: {P["ink3"]}">{total}</span></div>')


def lista(compacta=False):
    filas = ''.join(fila_c(n, f, t, i in ON, compacta) for i, (n, f, t) in enumerate(L1))
    return (f'<div style="background: {P["ink6"]}; border: 1px solid {P["ink5"]}; border-radius: 8px; '
            f'overflow: hidden; margin-top: -1px">{filas}</div>')


# ------------------------------------------------------------------ lámina

def grilla(tarjeta, cols):
    items = ''.join(tarjeta(n, f, t, i in ON) for i, (n, f, t) in enumerate(L1))
    return (f'<div style="display: grid; grid-template-columns: repeat({cols}, minmax(0, 1fr)); '
            f'gap: 10px; align-items: stretch">{items}</div>')


def marco_tel(dentro):
    return (f'<div style="width: 390px; flex: none; border: 1px solid {P["ink5"]}; border-radius: 14px; '
            f'background: {P["ink7"]}; padding: 16px; display: flex; flex-direction: column; gap: 12px">'
            f'{seclab("", "Lección 1")}{dentro}</div>')


def lamina(w, h, cual):
    if cual == 'A':
        esc, tel = grilla(tarjeta_a, 6), grilla(tarjeta_a, 3)
    elif cual == 'B':
        esc, tel = grilla(tarjeta_b, 6), grilla(tarjeta_b, 3)
    else:
        esc, tel = lista(), lista(compacta=True)
    cuerpo = (f'<div style="padding: 32px; display: flex; gap: 48px; align-items: flex-start">'
              f'<div style="flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 12px">'
              f'{seclab("", "Lección 1")}{esc}</div>'
              f'{marco_tel(tel)}</div>')
    return f'<div class="f" style="width: {w}px; height: {h}px">{cuerpo}</div>'


W = 1760
Y = 16060
nuevos = {}
x = 0
for clave, titulo, h in [('A', 'Tarjetas · A, sin interruptor', 760),
                         ('B', 'Tarjetas · B, hoja primero', 760),
                         ('C', 'Tarjetas · C, lista', 760)]:
    nombre = f'Tarjetas{clave}.dc.html'
    tema('oscuro')
    emitir(nombre, titulo, W, h, lamina(W, h, clave), x, Y)
    nuevos[nombre] = {'x': x, 'y': Y, 'w': W, 'h': h, 'title': titulo}
    x += W + 80
json.dump(nuevos, io.open('nuevos5.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('\n'.join(nuevos))
