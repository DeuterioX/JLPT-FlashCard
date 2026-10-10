# -*- coding: utf-8 -*-
"""El modo deja de ser un selector: son los dos verbos de la barra de abajo."""
import io

# ------------------------------------------------------------------ lib
p = 'lib.py'
s = io.open(p, encoding='utf-8').read()
viejo = "def boton(txt, tipo='default', h=36, fs=14, crecer=False):"
nuevo = "def boton(txt, tipo='default', h=36, fs=14, crecer=False, apagado=False):"
assert viejo in s, 'no encontre la firma de boton'
s = s.replace(viejo, nuevo, 1)

viejo = """    flex = 'flex: 1 1 0; ' if crecer else ''"""
nuevo = """    flex = 'flex: 1 1 0; ' if crecer else ''
    # `apagado` va como opacidad y no como otro juego de colores: apaga el
    # botón entero -fondo, borde y palabra a la vez- así sigue siendo
    # reconocible como el mismo botón, sólo que fuera de alcance.
    if apagado:
        flex += 'opacity: .42; '"""
assert viejo in s, 'no encontre flex'
s = s.replace(viejo, nuevo, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# ------------------------------------------------------------------ gen
p = 'gen.py'
s = io.open(p, encoding='utf-8').read()

# 1. fuera el segmento de modo
i = s.index('    # El modo va ACÁ y no en la barra de abajo')
j = s.index('    sel = (f\'<span style="display: flex; align-items: center; gap: 8px; font-size: 13px; ')
s = s[:i] + s[j:]

viejo = """             f'<span style="display: flex; align-items: center; gap: 16px; flex-wrap: wrap">'
             f'{segbox}{modobox}</span>{"" if movil else sel}</div>')"""
nuevo = """             f'{segbox}{"" if movil else sel}</div>')"""
assert viejo in s, 'no encontre fila1'
s = s.replace(viejo, nuevo, 1)

# 2. la barra: los dos verbos
viejo = """    barra = (f'<div style="position: absolute; left: 0; right: 0; bottom: {56 if movil else 0}px; '
             f'height: 61px; display: flex; align-items: center; justify-content: space-between; '
             f'padding: 0 16px; background: {P["ink6"]}; border-top: 1px solid {P["ink5"]}">'
             f'<span style="font-size: 13px; color: {P["ink2"]}">'
             f'<b style="color: {P["ink0"]}">{3 if palabras else 4}</b> grupos · '
             f'<b style="color: {P["ink0"]}">{92 if palabras else 20}</b> cartas</span>'
             f'{boton("Comenzar →", "primario")}</div>')"""
nuevo = """    # El modo NO es un selector aparte: son los dos verbos con los que se
    # arranca la ronda, y el que apretás decide de qué ronda se trata. Con un
    # mazo de kana «Significados» va apagado, porque `card.meaning` es NULL en
    # los mazos incluidos y preguntar qué quiere decir あ no significa nada.
    verbos = (f'{boton("Significados →", crecer=movil, apagado=not palabras)}'
              f'{boton("Escribir →", "primario", crecer=movil)}')
    cuenta = (f'<span style="font-size: 13px; color: {P["ink2"]}; white-space: nowrap">'
              f'<b style="color: {P["ink0"]}">{3 if palabras else 4}</b> grupos · '
              f'<b style="color: {P["ink0"]}">{92 if palabras else 20}</b> cartas</span>')

    if movil:
        # Dos renglones: en 390px el rótulo y los dos botones en una fila no
        # entran -medido, «4 grupos · 20 cartas» partía en dos líneas-. Y la
        # barra pasa de 61 a 88px, que es lo que el cuerpo tiene que
        # descontarse arriba de la tab bar.
        barH, dentro = 88, (f'display: flex; flex-direction: column; justify-content: center; '
                            f'gap: 8px; padding: 0 16px')
        contenido = (f'{cuenta}<span style="display: flex; align-items: center; gap: 8px; '
                     f'width: 100%">{verbos}</span>')
    else:
        barH, dentro = 61, ('display: flex; align-items: center; justify-content: space-between; '
                            'padding: 0 16px')
        contenido = f'{cuenta}<span style="display: flex; align-items: center; gap: 8px">{verbos}</span>'

    barra = (f'<div style="position: absolute; left: 0; right: 0; bottom: {56 if movil else 0}px; '
             f'height: {barH}px; {dentro}; background: {P["ink6"]}; '
             f'border-top: 1px solid {P["ink5"]}">{contenido}</div>')"""
assert viejo in s, 'no encontre la barra'
s = s.replace(viejo, nuevo, 1)

# 3. el cuerpo se descuenta la barra nueva
viejo = """f'position: absolute; left: 0; right: 0; top: 48px; bottom: {117 if movil else 61}px; '"""
nuevo = """f'position: absolute; left: 0; right: 0; top: 48px; '
              f'bottom: {56 + barH if movil else barH}px; '"""
assert viejo in s, 'no encontre el cuerpo'
s = s.replace(viejo, nuevo, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
