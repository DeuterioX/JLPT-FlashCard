# -*- coding: utf-8 -*-
"""El idioma es una fila tocable en los DOS tamaños; el tema sólo en teléfono.

El tema tiene tres opciones y no va a tener más: el segmento las muestra todas
a la vez, que en escritorio es mejor que esconderlas. El idioma sí va a crecer
-hoy dos, mañana los que haya-, y un segmento que crece deja de entrar. Por eso
el idioma es una fila en los dos tamaños y el tema sólo en teléfono.
"""
import pathlib

GEN = pathlib.Path('gen.py')
g = GEN.read_text(encoding='utf-8')


def rep(a, b):
    global g
    assert a in g, a[:70]
    g = g.replace(a, b)


rep("""    if movil:
        idioma_ctl = selector('Español', apagado=True)
    else:
        idioma_ctl = segmento(['Español', '日本語'], 'Español')
        idioma_ctl = f'<span style="opacity: .42; display: inline-flex">{idioma_ctl}</span>'""",
    """    # El idioma es una fila en los dos tamaños: hoy son dos opciones, pero la
    # lista va a crecer y un segmento que crece deja de entrar. El tema no: son
    # tres y van a seguir siendo tres.
    idioma_ctl = selector('Español', apagado=True)""")

GEN.write_text(g, encoding='utf-8')
print('gen.py: el idioma, fila en los dos tamaños')
