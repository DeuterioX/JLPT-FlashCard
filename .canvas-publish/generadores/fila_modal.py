# -*- coding: utf-8 -*-
"""En teléfono la fila entera se toca y abre un modal con las opciones.

Deja la lista con UNA sola gramática: todo lo que se toca termina en chevrón, y
lo que hay antes es el valor de ahora. «Acerca de» ya era así.

El modal y no un menú anclado: la app ya tiene modales en todas partes -crear,
renombrar, borrar, mover, el diccionario- y ninguno anclado a un control. Uno
anclado sería la primera cosa de su clase, con su propia manera de cerrarse y
de posicionarse contra los bordes.
"""
import pathlib

GEN = pathlib.Path('gen.py')
g = GEN.read_text(encoding='utf-8')


def rep(a, b):
    global g
    assert a in g, a[:70]
    g = g.replace(a, b)


# El control de teléfono pasa a ser el valor y el chevrón.
rep("""def selector(valor, apagado=False):
    \"\"\"El control de un ajuste en teléfono: el valor y el signo de que se abre.

    Tiene borde y fondo propios, así que se lee como algo que se toca y no como
    un dato más de la fila. Al tocarlo cae un menú anclado debajo, con tilde en
    la opción de ahora (ver `TelAjustesMenu` en el canvas).
    \"\"\"
    op = 'opacity: .42; ' if apagado else ''
    return (f'<span style="{op}display: inline-flex; align-items: center; gap: 8px; '
            f'height: 30px; padding: 0 10px; border-radius: 7px; background: {P["ink5"]}; '
            f'border: 1px solid {P["ink4"]}; font-size: 13px; color: {P["ink0"]}; '
            f'white-space: nowrap">{valor}'
            f'<span style="font-size: 10px; color: {P["ink3"]}; line-height: 1">▾</span></span>')""",
    """def selector(valor, apagado=False):
    \"\"\"El control de un ajuste en teléfono: el valor de ahora y el chevrón.

    Sin caja: lo que se toca es la FILA entera, no un control adentro de ella.
    Así la lista tiene una sola gramática -todo lo que lleva a algún lado
    termina en chevrón- y el blanco para el dedo es la fila completa, no una
    caja de 30px en un rincón.
    \"\"\"
    op = 'opacity: .42; ' if apagado else ''
    return (f'<span style="{op}display: inline-flex; align-items: center; gap: 8px; '
            f'font-size: 13px; color: {P["ink2"]}; white-space: nowrap">{valor}'
            f'<span style="font-size: 18px; color: {P["ink3"]}; line-height: 1">›</span></span>')""")

GEN.write_text(g, encoding='utf-8')
print('gen.py: fila tocable con chevrón')
