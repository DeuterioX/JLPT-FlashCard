# -*- coding: utf-8 -*-
"""Propuestas para el control de «seleccionar todos / ninguno».

Lo que hay hoy es una píldora con borde, flotando a la derecha de la franja,
con un cuadrado relleno adentro. Tres problemas, y el tercero es el que más
molesta:

1. Compite con el selector de mazos. Son dos controles con marco propio en la
   misma franja, y el de mazos es el que manda: elegir mazo cambia TODA la
   grilla, seleccionar es un atajo sobre lo que ya está.
2. El cuadrado relleno se lee como estado -«esto está tildado»- y no como
   acción. En una pantalla donde los grupos sí tienen estado tildado, eso es
   decir dos cosas con el mismo dibujo.
3. En tema oscuro el marco del botón y el fondo de la franja quedan a dos
   pasos de luminosidad, así que la píldora flota: se ve la caja antes que lo
   que hay adentro.

Las cuatro propuestas atacan eso de maneras distintas. Se dibujan EN CONTEXTO
-con el selector de mazos al lado y el borde de la grilla abajo- porque el
problema es de vecindario: suelto, cualquiera de los cinco se ve bien.
"""
import io, json, os
from lib import P, tema, UI, MONO, page
from gen import emitir, BOARDS

W, H = 1240, 980

# Los paths son los de Bootstrap Icons, copiados del paquete que ya usa la app
# -`react-bootstrap-icons`-, no dibujados a mano.
ICO = {
    'square': ['M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z'],
    'check-square': ['M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z',
                     'M10.97 4.97a.75.75 0 0 1 1.071 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425z'],
    'dash-square': ['M14 1a1 1 0 0 1 1 1v12a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1zM2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2z',
                    'M4 8a.5.5 0 0 1 .5-.5h7a.5.5 0 0 1 0 1h-7A.5.5 0 0 1 4 8'],
    'check-square-fill': ['M2 0a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V2a2 2 0 0 0-2-2zm10.03 4.97a.75.75 0 0 1 .011 1.05l-3.992 4.99a.75.75 0 0 1-1.08.02L4.324 8.384a.75.75 0 1 1 1.06-1.06l2.094 2.093 3.473-4.425a.75.75 0 0 1 1.08-.022z'],
    'check2-all': ['M12.354 4.354a.5.5 0 0 0-.708-.708L5 10.293 1.854 7.146a.5.5 0 1 0-.708.708l3.5 3.5a.5.5 0 0 0 .708 0zm-4.208 7-.896-.897.707-.707.543.543 6.646-6.647a.5.5 0 0 1 .708.708l-7 7a.5.5 0 0 1-.708 0',
                   'm5.354 7.146.896.897-.707.707-.897-.896a.5.5 0 1 1 .708-.708'],
}


def ico(nombre, px=14, color=None):
    c = color or P['ink0']
    d = ''.join(f'<path d="{p}"/>' for p in ICO[nombre])
    return (f'<svg viewBox="0 0 16 16" fill="{c}" aria-hidden="true" '
            f'style="width: {px}px; height: {px}px; display: block; flex: none">{d}</svg>')


def mazos(elegido=0):
    """El selector de mazos, tal cual está hoy: la referencia de peso visual."""
    seg = ''
    for i, t in enumerate(['Hiragana', 'Katakana', 'Minna no Nihongo I']):
        on = i == elegido
        seg += (f'<span style="padding: 4px 12px; border-radius: 6px; font-size: 12px; '
                f'white-space: nowrap; '
                f'{"background: " + P["ink7"] + "; color: " + P["ink0"] if on else "color: " + P["ink2"]}">{t}</span>')
    return (f'<span style="display: inline-flex; padding: 3px; border-radius: 8px; '
            f'background: {P["ink5"]}">{seg}</span>')


# ---------------------------------------------------------------- los cinco

def hoy():
    def mitad(nombre, primera):
        borde = '' if primera else f'border-left: 1px solid {P["ink4"]}; '
        return (f'<span style="{borde}height: 100%; padding: 0 12px; display: inline-flex; '
                f'align-items: center">{ico(nombre)}</span>')
    return (f'<span style="display: inline-flex; height: 33px; border: 1px solid {P["ink4"]}; '
            f'border-radius: 7px; overflow: hidden; background: {P["ink5"]}">'
            f'{mitad("check-square-fill", True)}{mitad("dash-square", False)}</span>')


def a_casilla(estado='algunos'):
    """Una sola casilla de tres estados, como el encabezado de una tabla.

    Dice el estado Y es la acción: vacía si no hay ninguno, con guión si hay
    algunos, tildada si están todos. Apretarla va al extremo contrario.
    """
    glifo = {'ninguno': 'square', 'algunos': 'dash-square', 'todos': 'check-square'}[estado]
    return (f'<span style="display: inline-flex; align-items: center; gap: 8px; height: 33px; '
            f'padding: 0 10px; border-radius: 7px; color: {P["ink2"]}">'
            f'{ico(glifo, 15, P["ink0"])}'
            f'<span style="font-size: 13px">Todos</span></span>')


def b_palabras():
    """Dos verbos de texto, sin caja. El control más liviano posible."""
    def v(txt, fuerte=False):
        col = P['ink0'] if fuerte else P['ink2']
        return f'<span style="font-size: 13px; color: {col}">{txt}</span>'
    return (f'<span style="display: inline-flex; align-items: center; gap: 8px; height: 33px">'
            f'{v("todos", True)}'
            f'<span style="color: {P["ink4"]}; font-size: 13px">·</span>'
            f'{v("ninguno", True)}</span>')


def c_segmento():
    """La misma bandeja con píldoras que el selector de mazos de al lado.

    No agrega una forma nueva a la franja: repite la que ya está, así los dos
    controles se leen como de la misma familia en vez de competir.
    """
    def p(txt):
        return (f'<span style="padding: 4px 11px; border-radius: 6px; font-size: 12px; '
                f'white-space: nowrap; color: {P["ink2"]}">{txt}</span>')
    return (f'<span style="display: inline-flex; padding: 3px; border-radius: 8px; '
            f'background: {P["ink5"]}">{p("Todos")}{p("Ninguno")}</span>')


def d_alterna(todos_puestos=False):
    """Un solo botón que alterna: dice lo que va a hacer, no los dos caminos."""
    txt = 'Ninguno' if todos_puestos else 'Todos'
    glifo = 'dash-square' if todos_puestos else 'check2-all'
    return (f'<span style="display: inline-flex; align-items: center; gap: 7px; height: 33px; '
            f'padding: 0 12px; border-radius: 7px; background: {P["ink5"]}; '
            f'border: 1px solid {P["ink4"]}; color: {P["ink0"]}; font-size: 13px">'
            f'{ico(glifo, 14)}{txt}</span>')


# ---------------------------------------------------------------- la lámina

def tira(rotulo, control, nota, extra=''):
    """La franja de Práctica con el control propuesto a la derecha.

    Se dibuja el borde de la grilla abajo porque parte del problema es cómo se
    apoya el control contra lo que viene después.
    """
    return (f'<div style="display: flex; flex-direction: column; gap: 9px">'
            f'<div style="display: flex; align-items: baseline; gap: 10px">'
            f'<span style="font-family: {MONO}; font-size: 10px; letter-spacing: .08em; '
            f'text-transform: uppercase; color: {P["shu"]}">{rotulo}</span>'
            f'<span style="font-size: 11.5px; color: {P["ink3"]}">{nota}</span></div>'
            f'<div style="border: 1px solid {P["ink5"]}; border-radius: 10px; overflow: hidden">'
            f'<div style="display: flex; align-items: center; justify-content: space-between; '
            f'gap: 12px; padding: 12px 16px; background: {P["ink7"]}">'
            f'{mazos()}{control}</div>'
            f'<div style="height: 54px; background: {P["ink6"]}; border-top: 1px solid {P["ink5"]}; '
            f'display: flex; align-items: center; padding: 0 16px; gap: 8px">'
            f'<span style="font-size: 11px; color: {P["ink3"]}">la grilla de grupos empieza acá</span>'
            f'</div></div>{extra}</div>')


def estados():
    """Los tres estados de la casilla, que es lo que la hace distinta."""
    def uno(e, txt):
        return (f'<span style="display: flex; align-items: center; gap: 7px">'
                f'{ico({"ninguno": "square", "algunos": "dash-square", "todos": "check-square"}[e], 14, P["ink2"])}'
                f'<span style="font-size: 11px; color: {P["ink3"]}">{txt}</span></span>')
    return (f'<div style="display: flex; gap: 18px; padding-left: 2px">'
            f'{uno("ninguno", "ninguno puesto")}{uno("algunos", "algunos")}'
            f'{uno("todos", "todos")}</div>')


def lamina(w, h):
    cab = (f'<div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px">'
           f'<span style="font-size: 19px; font-weight: 700; color: {P["ink0"]}">'
           f'Seleccionar todos o ninguno</span>'
           f'<span style="font-size: 12.5px; color: {P["ink2"]}; max-width: 760px; line-height: 1.6">'
           f'El de hoy compite con el selector de mazos -dos marcos en la misma franja- y usa un '
           f'cuadrado relleno, que en esta pantalla ya significa «grupo tildado». Las cuatro '
           f'propuestas salen de ahí.</span></div>')

    tiras = ''.join([
        tira('Hoy', hoy(),
             'dos íconos soldados, con marco propio'),
        tira('A · Casilla de tres estados', a_casilla('algunos'),
             'dice el estado y además es la acción', estados()),
        tira('B · Dos palabras', b_palabras(),
             'sin caja: el control más liviano que existe'),
        tira('C · Segmento', c_segmento(),
             'la misma forma que el selector de mazos'),
        tira('D · Un solo verbo', d_alterna(False),
             'alterna: dice lo que va a hacer, no los dos caminos'),
    ])

    cuerpo = (f'<div style="padding: 26px 28px; display: flex; flex-direction: column; gap: 20px">'
              f'{cab}{tiras}</div>')
    return f'<div class="f" style="width: {w}px; height: {h}px">{cuerpo}</div>'


# ----------------------------------------------------------------- teléfono

def mazos_tel(elegido=0):
    """En teléfono entran dos mazos y la ventana incluye al elegido, como hoy."""
    seg = ''
    for i, t in enumerate(['Hiragana', 'Katakana']):
        on = i == elegido
        seg += (f'<span style="padding: 4px 12px; border-radius: 6px; font-size: 12px; '
                f'white-space: nowrap; '
                f'{"background: " + P["ink7"] + "; color: " + P["ink0"] if on else "color: " + P["ink2"]}">{t}</span>')
    return (f'<span style="display: inline-flex; padding: 3px; border-radius: 8px; '
            f'background: {P["ink5"]}">{seg}</span>')


def tira_tel(rotulo, control, nota):
    """La misma franja, a 390px: el selector se queda con el renglón y el
    control baja al siguiente, al ras de la derecha. Es lo que hace hoy la app
    -la franja mide 112px de alto en teléfono contra 68 en escritorio-."""
    return (f'<div style="display: flex; flex-direction: column; gap: 9px; width: 390px">'
            f'<div style="display: flex; align-items: baseline; gap: 8px">'
            f'<span style="font-family: {MONO}; font-size: 10px; letter-spacing: .08em; '
            f'text-transform: uppercase; color: {P["shu"]}">{rotulo}</span>'
            f'<span style="font-size: 10.5px; color: {P["ink3"]}">{nota}</span></div>'
            f'<div style="border: 1px solid {P["ink5"]}; border-radius: 10px; overflow: hidden">'
            f'<div style="display: flex; flex-direction: column; align-items: flex-end; gap: 10px; '
            f'padding: 12px 16px; background: {P["ink7"]}">'
            f'<span style="align-self: stretch">{mazos_tel()}</span>{control}</div>'
            f'<div style="height: 46px; background: {P["ink6"]}; border-top: 1px solid {P["ink5"]}; '
            f'display: flex; align-items: center; padding: 0 16px">'
            f'<span style="font-size: 10.5px; color: {P["ink3"]}">la grilla empieza acá</span>'
            f'</div></div></div>')


def lamina_tel(w, h):
    cab = (f'<div style="display: flex; flex-direction: column; gap: 6px; margin-bottom: 4px">'
           f'<span style="font-size: 19px; font-weight: 700; color: {P["ink0"]}">'
           f'Seleccionar · en teléfono</span>'
           f'<span style="font-size: 12.5px; color: {P["ink2"]}; max-width: 820px; line-height: 1.6">'
           f'A 390px la franja envuelve: el selector de mazos se queda con el renglón y el control '
           f'baja al siguiente, al ras de la derecha. Ahí el de hoy se nota más, porque queda una '
           f'caja chica y sola en una línea que de otro modo estaría vacía.</span></div>')

    filas = [
        ('Hoy', hoy(), 'una caja sola en su renglón'),
        ('A · Casilla', a_casilla('algunos'), 'estado y acción'),
        ('B · Dos palabras', b_palabras(), 'no agrega ninguna caja'),
        ('C · Segmento', c_segmento(), 'repite la forma de arriba'),
        ('D · Un verbo', d_alterna(False), 'una sola caja, más chica'),
    ]
    tiras = ''.join(tira_tel(*f) for f in filas)
    cuerpo = (f'<div style="padding: 26px 28px; display: flex; flex-direction: column; gap: 20px">'
              f'{cab}'
              f'<div style="display: flex; flex-wrap: wrap; gap: 22px 28px">{tiras}</div></div>')
    return f'<div class="f" style="width: {w}px; height: {h}px">{cuerpo}</div>'


Y = 13600
WT, HT = 1340, 790
nuevos = {}
laminas = [
    ('SelProp', 'Seleccionar · propuestas', 'oscuro', 0, W, H, lamina),
    ('ClSelProp', 'Seleccionar · propuestas · claro', 'claro', W + 30, W, H, lamina),
    ('SelPropTel', 'Seleccionar · en teléfono', 'oscuro', 2 * W + 210, WT, HT, lamina_tel),
    ('ClSelPropTel', 'Seleccionar · en teléfono · claro', 'claro', 2 * W + 240 + WT, WT, HT, lamina_tel),
]
for nombre, titulo, t, x, w, h, fn in laminas:
    tema(t)
    emitir(f'{nombre}.dc.html', titulo, w, h, fn(w, h), x, Y)
    nuevos[f'{nombre}.dc.html'] = {'x': x, 'y': Y, 'w': w, 'h': h, 'title': titulo}
tema('oscuro')

json.dump(nuevos, io.open('nuevos3.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('\n'.join(nuevos))
