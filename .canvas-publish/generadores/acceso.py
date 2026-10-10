# -*- coding: utf-8 -*-
"""Practica con un mazo de palabras: es donde se entra a Significados, y era
el unico estado del modo que el lienzo no mostraba."""
import io

p = 'gen.py'
s = io.open(p, encoding='utf-8').read()

# 1. la firma
viejo = """def practica(w, h):
    movil = w < 600"""
nuevo = """def practica(w, h, palabras=False):
    \"\"\"`palabras=True` muestra el mismo tablero con un mazo de vocabulario.

    Es el que hace falta para ver el acceso a Significados: con un mazo de
    kana el modo está apagado -`card.meaning` es NULL en los mazos incluidos-,
    así que en Hiragana no hay forma de verlo encendido.
    \"\"\"
    movil = w < 600"""
assert viejo in s, 'no encontre la firma'
s = s.replace(viejo, nuevo, 1)

# 2. las tarjetas: series de kana o grupos de palabras
viejo = """    tarjetas = ''
    for i, (nombre, filas) in enumerate(SERIES[:cols * 2]):
        tarjetas += tarjeta_grupo(nombre, filas, i in ENCENDIDAS, alto, kpx, paso)"""
nuevo = """    if palabras:
        # Cada unidad muestra las palabras que tiene cargadas; el recorte con
        # puntos suspensivos de `tarjeta_grupo` se encarga de けんきゅうしゃ.
        grupos_v = [(nombre, [(k, r) for k, r, _ in PALABRAS[i:i + 5]])
                    for i, (nombre, _) in enumerate(GRUPOS_MINNA)]
        encendidas = {0, 1, 4}
    else:
        grupos_v = SERIES[:cols * 2]
        encendidas = ENCENDIDAS
    tarjetas = ''
    for i, (nombre, filas) in enumerate(grupos_v):
        tarjetas += tarjeta_grupo(nombre, filas, i in encendidas, alto, kpx, paso)"""
assert viejo in s, 'no encontre las tarjetas'
s = s.replace(viejo, nuevo, 1)

# 3. el segmento de mazo: en telefono entran dos, y la ventana tiene que
#    incluir al elegido
viejo = """    seg = ''
    for i, t in enumerate(['Hiragana', 'Katakana', 'Minna no Nihongo I'][:2 if movil else 3]):
        on = i == 0
        seg += (f'<span style="padding: 4px 12px; border-radius: 6px; font-size: 12px; '
                f'{"background: " + P["ink7"] + "; color: " + P["ink0"] if on else "color: " + P["ink2"]}">{t}</span>')"""
nuevo = """    mazos_v = ['Hiragana', 'Katakana', 'Minna no Nihongo I']
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
                f'{"background: " + P["ink7"] + "; color: " + P["ink0"] if on else "color: " + P["ink2"]}">{t}</span>')"""
assert viejo in s, 'no encontre el segmento de mazo'
s = s.replace(viejo, nuevo, 1)

# 4. el segmento de modo
viejo = """    modo = ''
    for t, on, hay in [('Escribir', True, True), ('Significados', False, False)]:"""
nuevo = """    modo = ''
    for t, on, hay in ([('Escribir', False, True), ('Significados', True, True)] if palabras
                       else [('Escribir', True, True), ('Significados', False, False)]):"""
assert viejo in s, 'no encontre el segmento de modo'
s = s.replace(viejo, nuevo, 1)

# 5. el rotulo y la cabecera de seccion
viejo = """             f'<b style="color: {P["ink0"]}">4</b> grupos · <b style="color: {P["ink0"]}">20</b> cartas</span>'"""
nuevo = """             f'<b style="color: {P["ink0"]}">{3 if palabras else 4}</b> grupos · '
             f'<b style="color: {P["ink0"]}">{92 if palabras else 20}</b> cartas</span>'"""
assert viejo in s, 'no encontre el rotulo'
s = s.replace(viejo, nuevo, 1)

viejo = """f'overflow: hidden">{fila1}{seclab("基本", "gojūon")}{grid}</div>')"""
nuevo = """f'overflow: hidden">{fila1}'
              f'{"" if palabras else seclab("基本", "gojūon")}{grid}</div>')"""
assert viejo in s, 'no encontre el cuerpo'
s = s.replace(viejo, nuevo, 1)

io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# ---------------------------------------------------------------- build
p = 'build.py'
s = io.open(p, encoding='utf-8').read()
WRAP = """def practica_pal_d(w, h):
    return practica(w, h, palabras=True)


def practica_pal_m(w, h):
    return practica(w, h, palabras=True)


"""
s = s.replace('def signif_d(w, h):', WRAP + 'def signif_d(w, h):', 1)

viejo = """y = fila_de(y, 'Repasar el significado, sin escribir', [
    ('EscSignif.dc.html', 'Significados · escritorio', signif_d, D),"""
nuevo = """y = fila_de(y, 'Repasar el significado, sin escribir', [
    ('EscPracticaPal.dc.html', 'Práctica con palabras · escritorio', practica_pal_d, D),
    ('TelPracticaPal.dc.html', 'Práctica con palabras · teléfono', practica_pal_m, M),
    ('EscSignif.dc.html', 'Significados · escritorio', signif_d, D),"""
assert viejo in s, 'no encontre la fila'
s = s.replace(viejo, nuevo, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
