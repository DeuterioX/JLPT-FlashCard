# -*- coding: utf-8 -*-
"""Genera todos los artboards del canvas de Kitsune Cards."""
import io, json, os
from lib import (P, tema, UI, MINCHO, KANA, MONO, PAUTA, page, topbar, navbar_movil, tabbar, accion_barra, lapiz, engranaje, fila_carta, filos_swipe, botones_juntos, lupa, progreso, carta_n_de_m,
                 boton, campo, seclab, switch, tarjeta_grupo, hoja_quiz, modal)
from minna_datos import MINNA
from datos import (SERIES, ENCENDIDAS, PALABRAS, EXPRESIONES, MAZOS, GRUPOS_MINNA,
                   PEORES, HISTORIAL)

OUT = 'project'
os.makedirs(OUT, exist_ok=True)
BOARDS = []   # (archivo, w, h, titulo, x, y)

# El zorro de la app, subido al canvas como archivo. La url la devuelve el
# propio canvas y hay que escribirla tal cual.
LOGO = '/_blob/66853c1445a9ef7f01c3a8eadb595a09'


def emitir(nombre, titulo, w, h, cuerpo, x, y, css=''):
    io.open(f'{OUT}/{nombre}', 'w', encoding='utf-8', newline='\n').write(
        page(titulo, w, h, cuerpo, css))
    BOARDS.append((nombre, w, h, titulo, x, y))


def marco(w, h, dentro):
    return f'<div class="f" style="width: {w}px; height: {h}px">{dentro}</div>'


def eng_barra():
    """El engranaje de la barra de teléfono, con forma de botón.

    Mismo botón que «Renombrar» en Grupos y en Cartas -30px de alto, borde y
    fondo propios-: es la misma clase de cosa, una acción al ras de la derecha
    de la barra, y con el glifo suelto no se leía como algo que se toca.

    Sólo en las tres pantallas RAÍZ: son las únicas cuya barra no lleva ni
    flecha de volver ni acción propia. Desde una pantalla interna se sale a su
    raíz y de ahí a los ajustes, así que ese rincón nunca tiene dos cosas
    peleando por el mismo lugar.
    """
    return accion_barra(engranaje(15, P['ink0']))


# ============================================================ PRÁCTICA
def practica(w, h, palabras=False):
    """`palabras=True` muestra el mismo tablero con un mazo de vocabulario.

    Es el que hace falta para ver el acceso a Significados: con un mazo de
    kana el modo está apagado -`card.meaning` es NULL en los mazos incluidos-,
    así que en Hiragana no hay forma de verlo encendido.
    """
    movil = w < 600
    if movil:
        cols, alto, kpx, paso = 3, 176, 14, 27
        pad = 16
    else:
        cols, alto, kpx, paso = 6, 242, 19, 38.4
        pad = 16
    if palabras and movil:
        # Un nombre de grupo de vocabulario ocupa hasta TRES líneas en una
        # tarjeta de 112px -«Unidad 3 - Gran almacén», «Expresiones de uso en
        # clase»-, y el encabezado le come al papel 54px en vez de 18. Con el
        # alto de las series de kana el papel quedaba en 104px para 5
        # renglones de 27 y los cortaba al medio: se veía un romaji huérfano
        # arriba, sin su kana. Más alto y un renglón menos, y entran enteros
        # incluso en el peor nombre.
        alto, filas_n = 200, 4
    else:
        filas_n = 5

    if palabras:
        # Cada unidad muestra las palabras que tiene cargadas; el recorte con
        # puntos suspensivos de `tarjeta_grupo` se encarga de けんきゅうしゃ.
        # Rotadas y no en ventanas corridas: con `PALABRAS[i:i+5]` dos
        # unidades vecinas compartían cuatro de cinco palabras y las tarjetas
        # parecían un error. Y el grupo de expresiones lleva las suyas, que
        # además es el caso peor -frases de siete y ocho caracteres- puesto
        # donde de verdad va a caer.
        def _unas(i):
            return [(PALABRAS[(i * 3 + n) % len(PALABRAS)][0],
                     PALABRAS[(i * 3 + n) % len(PALABRAS)][1]) for n in range(filas_n)]
        grupos_v = [(nombre, list(EXPRESIONES[:filas_n]) if 'Expresiones' in nombre else _unas(i))
                    for i, (nombre, _) in enumerate(GRUPOS_MINNA)]
        encendidas = {0, 1, 4}
    else:
        grupos_v = SERIES[:cols * 2]
        encendidas = ENCENDIDAS
    def grilla(items):
        # En teléfono, 3 columnas que se reparten el ancho -`minmax(0, 1fr)` y
        # no `1fr`: con `1fr` una columna no baja de su contenido y una palabra
        # larga empujaba la tercera tarjeta fuera de la pantalla-. En
        # escritorio, como en la app: cada tarjeta mide según lo que lleva, de
        # 8 a 10rem si es kana y de 11 a 14rem si son palabras, y entran
        # tantas como haya lugar, alineadas a la izquierda.
        if movil:
            columnas = f'repeat({cols}, minmax(0, 1fr))'
        elif palabras:
            columnas = 'repeat(auto-fill, minmax(176px, 224px))'
        else:
            columnas = 'repeat(auto-fill, minmax(128px, 160px))'
        return (f'<div style="display: grid; grid-template-columns: {columnas}; '
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
        grid = grilla(tarjetas)

    mazos_v = ['Hiragana', 'Katakana', 'Minna no Nihongo I']
    elegido = 2 if palabras else 0
    # En teléfono sólo entran dos, y la ventana tiene que incluir al elegido:
    # con un corte fijo a los dos primeros, el mazo de palabras quedaba
    # seleccionado fuera de su propio segmento.
    if movil:
        desde = min(elegido, len(mazos_v) - 2)
        mazos_v = mazos_v[desde:desde + 2]
        elegido -= desde
    seg = ''
    for i, t in enumerate(mazos_v):
        on = i == elegido
        seg += (f'<span style="padding: 4px 12px; border-radius: 6px; font-size: 12px; '
                f'white-space: nowrap; '
                f'{"background: " + P["ink7"] + "; color: " + P["ink0"] if on else "color: " + P["ink2"]}">{t}</span>')
    segbox = (f'<span style="display: inline-flex; padding: 3px; border-radius: 8px; '
              f'background: {P["ink5"]}">{seg}</span>')

    # Dos verbos de texto, sin caja. Los botones con marco competían con el
    # selector de mazos -dos marcos en la misma franja, y el de mazos es el que
    # manda- y en tema oscuro la caja flotaba, porque su borde y el fondo
    # quedan a dos pasos de luminosidad. Sin caja no hay nada de eso, y encaja
    # con cómo habla el resto de la app, que usa texto apagado para todo lo
    # secundario. Sigue sin dibujarse en teléfono: ahí la franja envuelve y un
    # atajo secundario se queda con un renglón entero.
    sel = (f'<span style="display: flex; align-items: center; gap: 8px; font-size: 13px">'
           f'<span style="color: {P["ink0"]}">todos</span>'
           f'<span style="color: {P["ink4"]}">·</span>'
           f'<span style="color: {P["ink0"]}">ninguno</span></span>')

    fila1 = (f'<div style="display: flex; align-items: center; justify-content: space-between; '
             f'gap: 12px; flex-wrap: wrap">'
             f'{segbox}{"" if movil else sel}</div>')

    # El modo NO es un selector aparte: son los dos verbos con los que se
    # arranca la ronda, y el que apretás decide de qué ronda se trata. Con un
    # mazo de kana «Significados» va apagado, porque `card.meaning` es NULL en
    # los mazos incluidos y preguntar qué quiere decir あ no significa nada.
    verbos = botones_juntos([('Repasar significados', 'default', not palabras),
                             ('Repasar escritura', 'primario', False)], ancho_total=movil)
    cuenta = (f'<span style="font-size: 13px; color: {P["ink2"]}; white-space: nowrap">'
              f'<b style="color: {P["ink0"]}">{n_on if palabras else 4}</b> grupos · '
              f'<b style="color: {P["ink0"]}">{c_on if palabras else 20}</b> cartas</span>')

    if movil:
        # Dos renglones: en 390px el rótulo y los dos botones en una fila no
        # entran -medido, «4 grupos · 20 cartas» partía en dos líneas-. Y la
        # barra pasa de 61 a 88px, que es lo que el cuerpo tiene que
        # descontarse arriba de la tab bar.
        barH, dentro = 88, (f'display: flex; flex-direction: column; justify-content: center; '
                            f'gap: 8px; padding: 0 16px')
        contenido = f'{cuenta}{verbos}'
    else:
        barH, dentro = 61, ('display: flex; align-items: center; justify-content: space-between; '
                            'padding: 0 16px')
        contenido = f'{cuenta}{verbos}'

    barra = (f'<div style="position: absolute; left: 0; right: 0; bottom: {56 if movil else 0}px; '
             f'height: {barH}px; {dentro}; background: {P["ink6"]}; '
             f'border-top: 1px solid {P["ink5"]}">{contenido}</div>')

    cuerpo = (f'<div style="padding: {pad}px {pad}px 0; display: flex; flex-direction: column; gap: 14px; '
              f'position: absolute; left: 0; right: 0; top: 48px; '
              f'bottom: {56 + barH if movil else barH}px; '
              f'overflow: hidden">{fila1}'
              f'{"" if palabras else seclab("基本", "gojūon")}{grid}</div>')

    top = navbar_movil('Práctica', atras=False, accion=eng_barra()) if movil else topbar('Práctica')
    return marco(w, h, top + cuerpo + barra + (tabbar('Práctica') if movil else ''))


# ============================================================ MAZOS
def mazos(w, h):
    movil = w < 600
    filas = ''
    for i, (nombre, sub, builtin) in enumerate(MAZOS):
        punto = (f'<span style="width: 6px; height: 6px; border-radius: 50%; '
                 f'background: {P["verde"]}; display: inline-block; margin-left: 7px"></span>') if builtin else ''
        acc = '' if movil else (
            (f'<span style="font-size: 12px; font-weight: 600; color: {P["shu"]}; padding: 0 8px">Borrar</span>'
             if not builtin else '') + boton('Practicar', h=22, fs=12))
        borde = f'border-top: 1px solid {P["ink5"]}; ' if i else ''
        ico = ['あ', 'ア', '冊'][i]
        filos = filos_swipe(True, not builtin) if movil else ''
        rel = 'position: relative; ' if movil else ''
        filas += (f'<div style="{borde}{rel}display: flex; align-items: center; gap: 12px; '
                  f'padding: 10px 13px">{filos}'
                  f'<span style="width: 34px; font-family: {KANA}; font-size: 17px; color: {P["ink0"]}">{ico}</span>'
                  f'<span style="flex: 1; min-width: 0; display: flex; flex-direction: column">'
                  f'<span style="font-size: 13px; font-weight: 500">{nombre}{punto}</span>'
                  f'<span style="font-size: 11px; color: {P["ink3"]}; overflow: hidden; '
                  f'text-overflow: ellipsis; white-space: nowrap">{sub}</span></span>'
                  f'<span style="display: flex; gap: 5px; flex: none">{acc}</span></div>')

    lista = (f'<div style="background: {P["ink6"]}; border: 1px solid {P["ink4"]}; border-radius: 9px; '
             f'overflow: hidden">{filas}</div>')

    cab = seclab("冊", "3 mazos · 833 cartas", boton("+ Nuevo mazo", "primario", h=26, fs=12))

    cuerpo = (f'<div style="padding: 16px; display: flex; flex-direction: column; gap: 14px">'
              f'{cab}{lista}</div>')
    top = navbar_movil('Mazos', atras=False, accion=eng_barra()) if movil else topbar('Mazos')
    return marco(w, h, top + cuerpo + (tabbar('Mazos') if movil else ''))


# ============================================================ GRUPOS
def grupos(w, h):
    movil = w < 600
    filas = ''
    for i, (nombre, n) in enumerate(GRUPOS_MINNA):
        borde = f'border-top: 1px solid {P["ink5"]}; ' if i else ''
        acc = '' if movil else (
            f'<span style="font-size: 12px; font-weight: 600; color: {P["shu"]}; padding: 0 8px">Borrar</span>'
            + boton('Renombrar', h=22, fs=12))
        filos = filos_swipe(True, True) if movil else ''
        rel = 'position: relative; ' if movil else ''
        filas += (f'<div style="{borde}{rel}display: flex; align-items: center; gap: 12px; '
                  f'padding: 10px 13px">{filos}'
                  f'<span style="flex: 1; min-width: 0; display: flex; flex-direction: column">'
                  f'<span style="font-size: 13px; font-weight: 500">{nombre}</span>'
                  f'<span style="font-size: 11px; color: {P["ink3"]}">{n} cartas</span></span>'
                  f'<span style="display: flex; gap: 5px; flex: none">{acc}</span></div>')
    lista = (f'<div style="background: {P["ink6"]}; border: 1px solid {P["ink4"]}; border-radius: 9px; '
             f'overflow: hidden">{filas}</div>')
    miga = '' if movil else (
        f'<div style="display: flex; align-items: center; gap: 8px; font-size: 14px; color: {P["ink3"]}">'
        f'Mazos <span style="color: {P["ink4"]}">/</span> '
        f'<span style="color: {P["ink0"]}">Minna no Nihongo I</span>'
        f'{boton("Renombrar", h=26, fs=12)}</div>')
    cab = seclab("組", "5 grupos · 149 cartas", boton("+ Nuevo grupo", "primario", h=26, fs=12))
    cuerpo = (f'<div style="padding: 16px; display: flex; flex-direction: column; gap: 14px">'
              f'{miga}{cab}{lista}</div>')
    top = (navbar_movil('Minna no Nihongo I', accion=accion_barra(lapiz(15)))
           if movil else topbar('Mazos'))
    return marco(w, h, top + cuerpo + (tabbar('Mazos') if movil else ''))


# ============================================================ CARTAS
def cartas(w, h):
    movil = w < 600
    # el formulario de alta
    if movil:
        campos = (f'<div style="display: flex; flex-direction: column; gap: 8px">'
                  f'{campo("Kana", "えび")}{campo("Romaji", "ebi")}'
                  f'<div style="display: flex; gap: 8px">{boton("あ Hiragana", h=30, fs=13, crecer=True)}'
                  f'{boton("ア Katakana", h=30, fs=13, crecer=True)}</div>'
                  f'{campo("Significado", "camarón")}{boton("Agregar", h=36)}</div>')
    else:
        campos = (f'<div style="display: flex; gap: 10px; align-items: flex-start">'
                  f'{campo("Kana", "えび", 369)}'
                  f'<div style="width: 336px; display: flex; flex-direction: column; gap: 6px">'
                  f'{campo("Romaji", "ebi")}'
                  f'<div style="display: flex; gap: 8px">{boton("あ Hiragana", h=26, fs=13, crecer=True)}'
                  f'{boton("ア Katakana", h=26, fs=13, crecer=True)}</div></div>'
                  f'{campo("Significado", "camarón", crecer=True)}{boton("Agregar", h=36)}</div>')

    panel = (f'<div style="background: {P["ink6"]}; border: 1px solid {P["ink5"]}; border-radius: 9px; '
             f'padding: 13px; display: flex; flex-direction: column; gap: 10px">'
             f'<div style="display: flex; align-items: center; gap: 10px">'
             f'<span style="flex: 1; font-size: 11.5px; font-weight: 700">Nueva palabra en «Unidad 1»</span>'
             f'{boton(lupa(14) + ("Diccionario" if movil else "Buscar en el diccionario"), h=30 if movil else 26, fs=13)}</div>'
             f'{campos}</div>')

    n = 4 if movil else 9
    filas = ''
    for i, (k, r, m) in enumerate(PALABRAS[:n]):
        borde = f'border-top: 1px solid {P["ink5"]}; ' if i else ''
        if movil:
            filas += fila_carta(k, r, m, primera=(i == 0))
        else:
            acc = (f'<span style="font-size: 12px; font-weight: 600; color: {P["shu"]}">Borrar</span>'
                   + boton('Mover', h=22, fs=12))
            filas += (f'<div style="{borde}padding: 10px 13px; display: flex; align-items: center; gap: 12px">'
                      f'<span style="width: 176px; font-family: {KANA}; font-size: 16px">{k}</span>'
                      f'<span style="width: 176px; font-family: {MONO}; font-size: 14px; color: {P["ink2"]}">{r}</span>'
                      f'<span style="flex: 1; font-size: 14px; color: {P["ink2"]}">{m}</span>'
                      f'<span style="display: flex; gap: 5px">{acc}</span></div>')
    lista = (f'<div style="background: {P["ink6"]}; border: 1px solid {P["ink4"]}; border-radius: 9px; '
             f'overflow: hidden">{filas}</div>')

    miga = '' if movil else (
        f'<div style="display: flex; align-items: center; gap: 8px; font-size: 14px; color: {P["ink3"]}">'
        f'Mazos <span style="color: {P["ink4"]}">/</span> Minna no Nihongo I '
        f'<span style="color: {P["ink4"]}">/</span> <span style="color: {P["ink0"]}">Unidad 1</span>'
        f'{boton("Renombrar", h=26, fs=12)}</div>')

    cuerpo = (f'<div style="padding: 16px; display: flex; flex-direction: column; gap: 14px">'
              f'{miga}{panel}{seclab("語", "30 cartas")}{lista}</div>')
    top = navbar_movil('Unidad 1', accion=accion_barra(lapiz(15))) if movil else topbar('Mazos')
    return marco(w, h, top + cuerpo + (tabbar('Mazos') if movil else ''))


# ============================================================ QUIZ
def pista_tocar(movil):
    """«tocá la carta para revelar», colgando de la hoja.

    Sólo en teléfono y sólo mientras la carta está tapada: en escritorio está
    el botón y está la barra espaciadora, y una vez revelada, que se vuelva a
    tocar para ocultar ya se deduce. Es una instrucción que se lee una vez y
    después estorba, así que va en el gris más apagado y un escalón más chica
    que el resto.
    """
    if not movil:
        return ''
    return (f'<span style="font-size: 11px; line-height: 1.4; color: {P["ink3"]}">'
            f'tocá la carta para revelar</span>')


def contexto_ronda(txt):
    """El mazo y cuántos grupos, a la derecha de la barra de ronda en teléfono."""
    return (f'<span style="font-size: 12px; color: {P["ink2"]}; white-space: nowrap">{txt}</span>')


def quiz(w, h, kana='あ'):
    movil = w < 600
    lado = 280 if movil else 360
    # Ancho para la tira de celdas. En escritorio se acota al 78% del hueco:
    # con una palabra de siete kana la tira llegaba al 89% de la pantalla y
    # quedaba sin aire a los costados. En teléfono se usa todo, que ya es poco.
    disponible = (w - 48) if movil else (w - 160) * 0.78
    barH = 118 if movil else 80

    # Ronda EMPEZADA y no recién abierta: con «carta 1 de 5» la barra de
    # progreso queda en 0% y no se ve, que es justo lo que había que mostrar.
    # 5 cartas, 2 contestadas, la 3ª al frente: restantes cuenta la actual.
    hud = ''
    for i, (lab, val, mal) in enumerate([('Aciertos', '100%', False), ('Restantes', '3', False),
                                         ('Errores', '0', True)]):
        bl = f'border-left: 1px solid {P["ink4"]}; ' if i else ''
        col = P['shu'] if mal else P['ink0']
        hud += (f'<span style="{bl}padding: 6px 14px; display: flex; flex-direction: column; gap: 1px">'
                f'<span style="font-size: 9px; letter-spacing: .06em; text-transform: uppercase; '
                f'color: {P["ink3"]}">{lab}</span>'
                f'<span style="font-size: 14px; font-weight: 700; color: {col}">{val}</span></span>')
    hudbox = (f'<span style="display: flex; border: 1px solid {P["ink4"]}; border-radius: 8px; '
              f'overflow: hidden; flex: none">{hud}</span>')

    inp = (f'<span style="{"flex: 1 1 0; " if movil else f"width: 300px; "}height: 36px; border-radius: 7px; '
           f'display: flex; align-items: center; justify-content: center; font-size: 15px; '
           f'background: {P["papel"]}; border: 1px solid {P["sumi"]}; color: {P["sumiDim"]}; '
           f'box-shadow: 0 0 0 3px rgba(196,64,46,.22)">escribí en romaji</span>')

    kbd = (f'<span style="font-family: {MONO}; font-size: 12px; padding: 2px 6px; border-radius: 6px; '
           f'border: 1px solid {P["ink4"]}; border-bottom-width: 2px; color: {P["ink2"]}">Espacio</span>')
    der = f'{kbd}{boton("Revelar", h=30, fs=13)}'

    if movil:
        # Sin «Revelar»: en teléfono revelar es tocar la carta. El input se
        # queda con todo el ancho de la barra, que es lo único que ahí hace
        # falta -y con el teclado abierto es también lo único que se ve-.
        barra_inner = (f'{hudbox}<span style="display: flex; align-items: center; width: 100%">'
                       f'{inp}</span>')
        caja = ('display: flex; flex-direction: column; align-items: center; justify-content: center; '
                'gap: 12px; padding: 12px')
    else:
        # Grilla de 1fr auto 1fr y no `space-between`: con tres bloques de
        # anchos distintos, repartir el sobrante deja el input donde cae, no en
        # el centro de la pantalla. Es la misma grilla del mockup original.
        barra_inner = (f'<span style="justify-self: start">{hudbox}</span>{inp}'
                       f'<span style="justify-self: end; display: flex; align-items: center; '
                       f'gap: 8px">{der}</span>')
        caja = ('display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; '
                'gap: 16px; padding: 0 16px')

    barra = (f'<div style="position: absolute; left: 0; right: 0; bottom: 0; height: {barH}px; '
             f'background: {P["ink6"]}; border-top: 1px solid {P["ink5"]}; {caja}">{barra_inner}</div>')

    esc = (f'<span style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: {P["ink2"]}">'
           f'Hiragana · 1 grupo'
           f'<span style="font-family: {MONO}; font-size: 12px; padding: 2px 6px; border-radius: 5px; '
           f'border: 1px solid {P["ink4"]}; border-bottom-width: 2px">Esc</span>salir</span>')
    top = (f'<div style="height: 48px; display: flex; align-items: center; justify-content: space-between; '
           f'padding: 0 16px; background: {P["ink6"]}; border-bottom: 1px solid {P["ink5"]}">'
           f'<span style="display: flex; align-items: center; gap: 9px; font-weight: 700; font-size: 15px">'
           f'<span style="font-size: 17px">🦊</span>Kitsune Cards</span>{esc}</div>')
    if movil:
        top = navbar_movil('Repasar escritura', accion=contexto_ronda('Hiragana · 1 grupo'))

    stage = (f'<div style="position: absolute; left: 0; right: 0; top: 48px; bottom: {barH}px; '
             f'display: flex; flex-direction: column; align-items: center; justify-content: center; '
             f'gap: {18 if movil else 26}px">{hoja_quiz(kana, lado, disponible, 44 if movil else 80)}'
             f'{pista_tocar(movil)}{carta_n_de_m("carta 3 de 5")}</div>')
    return marco(w, h, top + stage + progreso(40, barH) + barra)


# ============================================================ SIGNIFICADOS
def significados(w, h, revelado=False):
    """Repaso de significados: la misma hoja del quiz, sin escribir.

    El quiz pregunta CÓMO SE LEE una carta y se valida escribiendo el romaji.
    Esto pregunta QUÉ QUIERE DECIR, y eso no se puede teclear: «Estudiante»,
    «Empleado de empresa» y «Estados unidos» no son respuestas que una caja de
    texto pueda dar por buenas. Así que la carta se revela y te calificás vos,
    que es el trato de cualquier flashcard.

    La hoja NO se da vuelta. El giro de 翻 es para el quiz, donde el kana se va
    y entra la respuesta; acá querés ver la palabra AL LADO de su significado,
    porque eso es lo que estás tratando de unir. Además el dorso no daría: en
    teléfono la hoja de けんきゅうしゃ mide 336×48, y ahí no entran dos renglones.

    El hueco del significado está reservado también sin revelar, así la hoja no
    salta hacia arriba cuando aparece.

    Sólo corre sobre cartas con significado. Un kana no tiene: `card.meaning`
    es NULL en los mazos incluidos, y preguntar qué quiere decir あ no
    significa nada.
    """
    movil = w < 600
    lado = 280 if movil else 360
    disponible = (w - 48) if movil else (w - 160) * 0.78
    barH = 118 if movil else 80
    hueco = 48 if movil else 64

    hud = ''
    for i, (lab, val, col) in enumerate([('Sabidas', '2', P['ink0']), ('Restantes', '27', P['ink0']),
                                         ('No sabidas', '1', P['shu'])]):
        bl = f'border-left: 1px solid {P["ink4"]}; ' if i else ''
        hud += (f'<span style="{bl}padding: 6px 14px; display: flex; flex-direction: column; gap: 1px">'
                f'<span style="font-size: 9px; letter-spacing: .06em; text-transform: uppercase; '
                f'color: {P["ink3"]}">{lab}</span>'
                f'<span style="font-size: 14px; font-weight: 700; color: {col}">{val}</span></span>')
    hudbox = (f'<span style="display: flex; border: 1px solid {P["ink4"]}; border-radius: 8px; '
              f'overflow: hidden; flex: none">{hud}</span>')

    def tecla(t):
        return (f'<span style="font-family: {MONO}; font-size: 12px; padding: 2px 6px; '
                f'border-radius: 6px; border: 1px solid {P["ink4"]}; border-bottom-width: 2px; '
                f'color: {P["ink2"]}">{t}</span>')

    # Revelar está SIEMPRE, y es un interruptor: muestra y esconde el
    # significado. No es un paso que se consume -eso era lo que estaba mal-,
    # porque en un repaso querés poder tapar la respuesta y volver a mirarla
    # sin salir de la carta. Va en la misma ranura que en el quiz, TECLA +
    # BOTÓN a la derecha, con las medidas del quiz (h=30, fs=13) y el mismo
    # botón `default`: el verde queda para «La sabía», que es una respuesta y
    # no un paso.
    #
    # Y aparte, siempre presentes, los dos de calificarse. Están desde el
    # principio a propósito: si te acordabas, calificás sin revelar nada.
    # «No la sabía» lleva el mismo botón que «Borrar el grupo» en los modales
    # -`peligro`, shu lleno-, que es el par exacto del verde de al lado.
    calif = [boton('No la sabía', 'peligro', h=30, fs=13),
             boton('La sabía', 'primario', h=30, fs=13)]
    rotulo = 'Ocultar' if revelado else 'Revelar'
    der = f'{tecla("Espacio")}{boton(rotulo, h=30, fs=13)}'

    if movil:
        # Sin teclas: acá no hay ningún campo que abra el teclado -de eso se
        # trata el modo-, así que anunciar «Espacio» y «Esc» es prometer algo
        # que en un teléfono no existe. Y sin «Revelar»: ahí revelar es tocar
        # la carta, así que la barra queda con los dos de calificarse
        # repartiéndose el ancho, que son la decisión de verdad.
        juntos = [boton('La sabía', 'primario', h=30, fs=13, crecer=True),
                  boton('No la sabía', 'peligro', h=30, fs=13, crecer=True)]
        barra_inner = (f'{hudbox}<span style="display: flex; align-items: center; gap: 8px; '
                       f'width: 100%">{"".join(juntos)}</span>')
        caja = ('display: flex; flex-direction: column; align-items: center; justify-content: center; '
                'gap: 12px; padding: 12px')
    else:
        # 1 y 2, no N y S: esas eran las iniciales de «No» y «Sí», o sea que
        # el atajo dependía de que la app hable castellano y se rompía en la
        # primera traducción. Un número no significa nada en ningún idioma:
        # lo único que dice es en qué orden está el botón, y eso se lee solo
        # porque la tecla está pegada al botón que dispara.
        # «La sabía» primero, y por lo tanto con el 1: la tecla la da la
        # POSICIÓN y no la respuesta -1 es «el primero de los dos»-, que es el
        # motivo por el que son números y no iniciales. Y primero la
        # afirmativa porque es la esperada: en un repaso la mayoría de las
        # cartas se saben, así que el camino corto tiene que ser ése.
        centro = (f'<span style="display: flex; align-items: center; gap: 8px">'
                  f'{tecla("1")}{calif[1]}{tecla("2")}{calif[0]}</span>')
        barra_inner = (f'<span style="justify-self: start">{hudbox}</span>{centro}'
                       f'<span style="justify-self: end; display: flex; align-items: center; '
                       f'gap: 8px">{der}</span>')
        caja = ('display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; '
                'gap: 16px; padding: 0 16px')

    barra = (f'<div style="position: absolute; left: 0; right: 0; bottom: 0; height: {barH}px; '
             f'background: {P["ink6"]}; border-top: 1px solid {P["ink5"]}; {caja}">{barra_inner}</div>')

    # «Minna no Nihongo I · Unidad 1» no entra en 390px: partía en dos líneas,
    # empujaba la barra de 48 a 95px y el escenario -que arranca en un `top:
    # 48px` fijo- quedaba tapado. En teléfono va sólo el grupo, que es el dato
    # que cambia mientras practicás.
    contexto = 'Minna no Nihongo I · 1 grupo'
    if movil:
        # «Esc» tampoco: sin teclado físico es una tecla que no se puede
        # apretar. Queda «Salir» como botón, que es la acción de verdad.
        esc = (f'<span style="display: flex; align-items: center; gap: 10px; font-size: 13px; '
               f'color: {P["ink2"]}; white-space: nowrap">{contexto}'
               f'{boton("Salir", h=26, fs=12)}</span>')
    else:
        esc = (f'<span style="display: flex; align-items: center; gap: 10px; font-size: 13px; '
               f'color: {P["ink2"]}; white-space: nowrap">{contexto}'
               f'<span style="font-family: {MONO}; font-size: 12px; padding: 2px 6px; border-radius: 5px; '
               f'border: 1px solid {P["ink4"]}; border-bottom-width: 2px">Esc</span>salir</span>')
    top = (f'<div style="height: 48px; display: flex; align-items: center; justify-content: space-between; '
           f'gap: 12px; padding: 0 16px; background: {P["ink6"]}; '
           f'border-bottom: 1px solid {P["ink5"]}">'
           f'<span style="display: flex; align-items: center; gap: 9px; font-weight: 700; '
           f'font-size: 15px; white-space: nowrap">'
           f'<span style="font-size: 17px">🦊</span>Kitsune Cards</span>{esc}</div>')
    if movil:
        top = navbar_movil('Repasar significados', accion=contexto_ronda(contexto))

    if revelado:
        respuesta = (f'<span style="font-family: {MONO}; font-size: {13 if movil else 15}px; '
                     f'color: {P["ink2"]}">kenkyuusha</span>'
                     f'<span style="font-size: {21 if movil else 30}px; color: {P["ink0"]}">Investigador</span>')
    else:
        respuesta = ''
    slot = (f'<div style="height: {hueco}px; display: flex; flex-direction: column; '
            f'align-items: center; justify-content: center; gap: 2px">{respuesta}</div>')

    frente = hoja_quiz("けんきゅうしゃ", lado, disponible, 44 if movil else 80)
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
             f'{"" if revelado else pista_tocar(movil)}{carta_n_de_m("carta 4 de 30")}</div>')
    # 3 contestadas de 30: 2 sabidas y 1 no sabida, la 4ª al frente.
    return marco(w, h, top + stage + progreso(10, barH) + barra)


# ============================================================ ESTADÍSTICAS
# Aciertos por grupo, tal cual los devuelve la app hoy.
POR_GRUPO = [('Serie NY', 0), ('Serie G', 0), ('Serie B', 0), ('Serie MY', 0),
             ('Serie Z', 0), ('Serie CH', 0), ('Serie GY', 0), ('Unidad 1', 0),
             ('Serie SH', 50), ('Serie H', 53)]


def stats(w, h):
    movil = w < 600

    # Dos semáforos con los mismos cortes: uno para rellenos y otro para
    # texto. El verde y el ámbar llenos se ven bien en los dos temas, pero
    # como texto sobre claro dan 2,7:1 y 2,2:1 -ilegibles-, así que las
    # cifras usan las variantes bajadas.
    def tono(p):
        return P['verde'] if p >= 85 else (P['ambar'] if p >= 60 else P['shu'])

    def tono_txt(p):
        return P['verdeTxt'] if p >= 85 else (P['ambarTxt'] if p >= 60 else P['shu'])

    def panel(titulo, nota, filas):
        return (f'<div style="background: {P["ink6"]}; border: 1px solid {P["ink5"]}; '
                f'border-radius: 9px; padding: 13px; display: flex; flex-direction: column; gap: 8px">'
                f'<span style="display: flex; align-items: baseline; gap: 10px">'
                f'<span style="flex: 1; font-size: 11.5px; font-weight: 700">{titulo}</span>'
                f'<span style="font-size: 10.5px; color: {P["ink3"]}">{nota}</span></span>'
                f'{filas}</div>')

    tiles = ''
    for lab, val, sub, col in [('Aciertos', '67%', '204 de 303', tono_txt(67)),
                               ('Errores', '99', 'en 30 días', P['shu']),
                               ('Rondas', '18', '0,6 por día', P['ink0']),
                               ('Dominadas', '1', 'de 384 cartas', P['ink0'])]:
        tiles += (f'<div style="background: {P["ink6"]}; border: 1px solid {P["ink5"]}; '
                  f'border-radius: 8px; padding: 11px 13px; display: flex; flex-direction: column; gap: 1px">'
                  f'<span style="font-size: 9px; letter-spacing: .06em; text-transform: uppercase; '
                  f'color: {P["ink3"]}">{lab}</span>'
                  f'<span style="font-size: 21px; font-weight: 700; color: {col}">{val}</span>'
                  f'<span style="font-size: 10.5px; color: {P["ink3"]}">{sub}</span></div>')
    tilebox = (f'<div style="display: grid; grid-template-columns: repeat({2 if movil else 4}, 1fr); '
               f'gap: 9px">{tiles}</div>')

    peores = ''
    for k, r, err, tot in PEORES:
        pct = round(err / tot * 100)
        peores += (f'<div style="display: flex; align-items: center; gap: 9px; font-size: 11px">'
                   f'<span style="width: {24 if movil else 46}px; font-family: {KANA}; '
                   f'font-size: 16px">{k}</span>'
                   f'<span style="width: {32 if movil else 58}px; font-family: {MONO}; '
                   f'color: {P["ink2"]}">{r}</span>'
                   f'<span style="flex: 1; height: 4px; border-radius: 2px; background: {P["ink5"]}; '
                   f'overflow: hidden"><span style="display: block; height: 4px; width: {pct}%; '
                   f'background: {P["shu"]}"></span></span>'
                   f'<span style="color: {P["ink3"]}; font-family: {MONO}; '
                   f'width: {38 if movil else 44}px; text-align: right">{err}/{tot}</span></div>')

    grupos_f = ''
    for nombre, pct in POR_GRUPO[:7 if movil else 10]:
        grupos_f += (f'<div style="display: flex; align-items: center; gap: 9px; font-size: 11px">'
                     f'<span style="width: {62 if movil else 90}px; '
                     f'color: {P["ink2"]}">{nombre}</span>'
                     f'<span style="flex: 1; height: 6px; border-radius: 3px; background: {P["ink5"]}; '
                     f'overflow: hidden"><span style="display: block; height: 6px; width: {pct}%; '
                     f'background: {tono(pct)}"></span></span>'
                     f'<span style="color: {P["ink2"]}; font-family: {MONO}; width: 30px; '
                     f'text-align: right">{pct}%</span></div>')

    hist = ''
    for fecha, dur, pct in HISTORIAL[:5 if movil else 7]:  # el resto queda fuera del alto del marco, como en la app
        hist += (f'<div style="display: flex; align-items: baseline; gap: 10px; padding: 4px 0; '
                 f'font-size: 11.5px">'
                 f'<span style="font-family: {MONO}; color: {P["ink2"]}">{fecha}</span>'
                 f'<span style="flex: 1; min-width: 0; color: {P["ink2"]}; overflow: hidden; '
                 f'text-overflow: ellipsis; white-space: nowrap">Hiragana · 1 grupo · 5 cartas</span>'
                 f'<span style="font-family: {MONO}; color: {P["ink2"]}">{dur}</span>'
                 f'<span style="width: 38px; text-align: right; font-weight: 500; '
                 f'color: {tono_txt(pct)}">{pct}%</span></div>')

    seg = (f'<span style="display: inline-flex; padding: 3px; border-radius: 8px; '
           f'background: {P["ink5"]}">'
           f'<span style="padding: 5px 14px; border-radius: 6px; font-size: 12px; '
           f'color: {P["ink2"]}">7 días</span>'
           f'<span style="padding: 5px 14px; border-radius: 6px; font-size: 12px; '
           f'background: {P["ink7"]}; color: {P["ink0"]}">30 días</span>'
           f'<span style="padding: 5px 14px; border-radius: 6px; font-size: 12px; '
           f'color: {P["ink2"]}">Siempre</span></span>')
    cta = boton('Practicar mis 19 peores ➜', 'primario', h=36 if movil else 32, fs=13,
                crecer=movil)

    p1 = panel('Las que más errás', 'errores / veces vista', peores)
    p2 = panel('Aciertos por grupo', 'últimos 30 días', grupos_f)
    p3 = panel('Historial de rondas', 'últimas 5' if movil else 'últimas 7', hist)

    if movil:
        # El segmento va solo arriba y el botón a ancho completo abajo de los
        # tiles, como en la app: en una fila los dos, el botón se come el
        # segmento o lo empuja fuera de los 390px.
        cuerpo = (f'<div style="padding: 16px; display: flex; flex-direction: column; gap: 12px">'
                  f'<div style="display: flex">{seg}</div>{tilebox}'
                  f'<div style="display: flex">{cta}</div>{p1}{p2}{p3}</div>')
    else:
        cuerpo = (f'<div style="padding: 16px; display: flex; flex-direction: column; gap: 14px">'
                  f'<div style="display: flex; align-items: center; justify-content: space-between; '
                  f'gap: 12px">{seg}{cta}</div>{tilebox}'
                  f'<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">{p1}{p2}</div>'
                  f'{p3}</div>')

    top = navbar_movil('Estadísticas', atras=False, accion=eng_barra()) if movil else topbar('Estadísticas')
    return marco(w, h, top + cuerpo + (tabbar('Estadísticas') if movil else ''))

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

    # En teléfono una caja desplegable, en escritorio el segmento entero: tres
    # opciones de 12px más el rótulo no entran en 390px sin apretar las dos
    # cosas, y la explicación caía a dos renglones.
    tema_ctl = (selector('Oscuro') if movil
                else segmento(['Automático', 'Claro', 'Oscuro'], 'Oscuro'))

    # El idioma todavía no existe: va apagado y con la razón escrita, no
    # escondido. Una pantalla de ajustes que esconde lo que viene no dice nada;
    # una que lo muestra apagado dice qué va a haber y dónde.
    # El idioma es una fila en los dos tamaños: hoy son dos opciones, pero la
    # lista va a crecer y un segmento que crece deja de entrar. El tema no: son
    # tres y van a seguir siendo tres.
    #
    # El valor va con el mismo color que el del tema, no apagado: la fila SE
    # TOCA y abre su modal, igual que la otra. Lo que todavía no existe son
    # algunas opciones de adentro, y ahí es donde se apagan. Apagar el valor de
    # la fila decía que no se puede tocar, que es lo contrario de lo que hace.
    idioma_ctl = selector('Español')

    apariencia = (
        fila_ajuste('色', 'Tema', 'Usar el del sistema, o fijar uno.', tema_ctl, primera=True))

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

    if not movil:
        # El ancho de lectura: con los 1440 enteros, el control de un ajuste
        # queda a 1300px de su rótulo y la fila deja de leerse como una fila.
        cuerpo = (f'<div style="display: flex; justify-content: center">'
                  f'<div style="width: 100%; max-width: 760px">{cuerpo}</div></div>')
    top = navbar_movil('Ajustes') if movil else barra_ajustes(activo=True)
    return marco(w, h, top + cuerpo + (tabbar('') if movil else ''))


# ============================================================ ACERCA DE
def acerca(w, h):
    """Acerca de: la marca, la hoja, el texto del proyecto y los créditos.

    El texto lo escribió el dueño del proyecto y va tal cual. Antes había acá
    una frase-lema -«Las cartas se escriben, no se eligen»- que se reemplaza
    por esto: son dos maneras distintas de presentar la app y puestas juntas se
    pisan, porque la primera promete una tesis y la segunda cuenta un origen.

    La prosa va alineada a la izquierda y no centrada como el lema: cinco
    párrafos centrados se leen mal, porque cada renglón arranca en una sangría
    distinta y el ojo tiene que buscar dónde empieza.
    """
    movil = w < 600
    # El párrafo ocupa la columna ENTERA, no una medida de lectura más angosta.
    # Con el texto a 620 dentro de una columna de 760 la justificación estaba
    # puesta pero no se leía: el borde derecho del párrafo caía 140px antes que
    # el filete de su propia sección, y un margen a plomo sin un borde de
    # referencia al lado no se ve. Se paga con renglones largos -unos 100
    # caracteres en escritorio-, que es el precio de que el bloque cierre.
    ancho = 358 if movil else 760

    marca = (f'<div style="display: flex; flex-direction: column; align-items: center; gap: 10px">'
             f'<img src="{LOGO}" alt="" style="display: block; height: {68 if movil else 84}px; '
             f'width: auto">'
             f'<span style="display: flex; flex-direction: column; align-items: center; gap: 2px">'
             f'<span style="font-size: {19 if movil else 21}px; font-weight: 700; '
             f'line-height: 1.25">Kitsune Cards</span>'
             f'<span style="font-family: {KANA}; font-size: 12px; letter-spacing: .02em; '
             f'color: {P["ink3"]}">キツネ・カード</span></span></div>')

    # La hoja de manuscrito con el nombre escrito: es la firma del diseño y la
    # misma donde vive el kana del quiz.
    hoja = (f'<div style="display: flex; justify-content: center">'
            f'{hoja_quiz("キツネ", 78 if movil else 92, ancho, 70)}</div>')

    parrafos = [
        'Este proyecto nació de una necesidad personal: quería una herramienta '
        'sencilla para estudiar japonés usando flashcards.',
        'Mientras utilizaba otra aplicación para aprender hiragana, quise empezar a '
        'practicar katakana y descubrí que esa funcionalidad estaba detrás de una '
        'suscripción paga. En lugar de pagar por algo que no necesitaba que fuera '
        'tan complejo, decidí crear mi propia solución.',
        'La aplicación permite practicar hiragana y katakana, reconocer palabras y '
        'frases en japonés y entrenar su escritura en romaji. También permite cargar '
        'contenido propio para adaptar la práctica a lo que cada uno quiera aprender.',
        'La idea no es reinventar el aprendizaje del japonés, sino crear una '
        'herramienta simple, útil y libre, basada en una necesidad real.',
        'La desarrollé originalmente para mí. Si además puede ser útil para otras '
        'personas que estén aprendiendo japonés, mucho mejor.',
    ]
    # Justificado, con guionado: sin `hyphens` una columna angosta abre ríos
    # de espacio entre palabras, que es lo que da mala fama a la justificación.
    cuerpo_txt = (f'<div style="display: flex; flex-direction: column; gap: 9px; '
                  f'width: 100%; font-size: {12.5 if movil else 13.5}px; '
                  f'line-height: 1.65; color: {P["ink2"]}; text-align: justify; '
                  f'hyphens: auto; -webkit-hyphens: auto">'
                  + ''.join(f'<span>{t}</span>' for t in parrafos)
                  + '</div>')

    def credito(rotulo, texto):
        return (f'<div style="display: flex; flex-direction: column; gap: 2px">'
                f'<span style="font-family: {MONO}; font-size: 9px; letter-spacing: .08em; '
                f'text-transform: uppercase; color: {P["ink3"]}">{rotulo}</span>'
                f'<span style="font-size: 11.5px; line-height: 1.5; color: {P["ink2"]}">{texto}</span></div>')

    creditos = (f'<div style="display: grid; grid-template-columns: {"1fr" if movil else "1fr 1fr"}; '
                f'gap: 12px 24px">'
                + credito('Versión', '1.0.0 · 5 de octubre de 2026')
                + credito('Hecha con', 'Next.js, Mantine y SQLite')
                + credito('Tipografía', 'M PLUS 2, M PLUS 1 Code, Zen Kaku Gothic New y '
                                        'Zen Old Mincho — SIL Open Font License')
                + credito('Diccionario', 'JMdict, del Electronic Dictionary Research and '
                                         'Development Group — CC BY-SA 4.0')
                + '</div>')

    def seccion(contenido, jp, ro):
        return (f'<div style="display: flex; flex-direction: column; gap: 10px; width: 100%">'
                f'{seclab(jp, ro)}{contenido}</div>')

    pila = (f'<div style="display: flex; flex-direction: column; align-items: center; '
            f'gap: {14 if movil else 18}px; width: 100%; max-width: {ancho}px">'
            f'{marca}{hoja}'
            f'{seccion(cuerpo_txt, "由", "sobre el proyecto")}'
            f'{seccion(creditos, "情報", "información")}</div>')

    cuerpo = (f'<div style="padding: {"16px 16px 72px" if movil else "20px 16px"}; '
              f'display: flex; justify-content: center">{pila}</div>')

    top = navbar_movil('Acerca de') if movil else barra_ajustes(activo=True)
    return marco(w, h, top + cuerpo + (tabbar('') if movil else ''))



def barra_ajustes(activo=False):
    """La barra de arriba con el engranaje al ras de la derecha.

    No es una cuarta pestaña: las tres de abajo son lugares donde se estudia, y
    eso es lo que las hace comparables entre sí. Los ajustes no son un cuarto
    lugar de estudio, son donde se configura todo lo demás.

    Ocupa el lugar donde hoy está el botón de tema, que pasa a vivir adentro.
    """
    bg = f'background: {P["ink5"]}; ' if activo else ''
    col = P['ink0'] if activo else P['ink2']
    eng = (f'<span style="margin-left: auto; {bg}width: 30px; height: 26px; border-radius: 6px; '
           f'display: grid; place-items: center">{engranaje(15, col)}</span>')
    return topbar('', ajustes=activo)


def selector(valor, apagado=False):
    """El control de un ajuste: el valor de ahora y el chevrón.

    Sin caja: lo que se toca es la FILA entera, no un control adentro de ella.
    Así la lista tiene una sola gramática -todo lo que lleva a algún lado
    termina en chevrón, y «Acerca de» ya era así- y el blanco para el dedo es
    la fila completa, no una caja en un rincón. Al tocarla abre un modal con
    las opciones.
    """
    op = 'opacity: .42; ' if apagado else ''
    return (f'<span style="{op}display: inline-flex; align-items: center; gap: 8px; '
            f'font-size: 13px; color: {P["ink2"]}; white-space: nowrap">{valor}'
            f'<span style="font-size: 18px; color: {P["ink3"]}; line-height: 1">›</span></span>')
