# -*- coding: utf-8 -*-
"""Lupa de la app, sin Editar en escritorio, barra de progreso, el rotulo
'carta N de M' donde lo pone la app, y sin teclas en telefono."""
import io

# ------------------------------------------------------------------ lib: lupa
p = 'lib.py'
s = io.open(p, encoding='utf-8').read()

LUPA = '''def lupa(px=14, color=None):
    """La lupa de Bootstrap Icons, la misma que usa la app.

    La maqueta traía el emoji 🔍, que es un dibujo de otra familia -a color,
    con mango azul- y no el ícono de `react-bootstrap-icons` que `Icon.tsx`
    monta de verdad. Va como SVG inline y no como fuente de íconos por lo
    mismo que en la app: se le puede dar el tamaño en el sitio y hereda el
    color de al lado.

    `display: block` es obligatorio: un SVG inline suma el descendiente de la
    fuente a su caja de línea y descentra la fila que lo contiene -ya pasó en
    la tab bar-.
    """
    c = color or P['ink0']
    return (f'<svg viewBox="0 0 16 16" fill="{c}" aria-hidden="true" '
            f'style="width: {px}px; height: {px}px; display: block; flex: none">'
            f'<path d="M11.742 10.344a6.5 6.5 0 1 0-1.397 1.398h-.001q.044.06.098.115l3.85 3.85a1 1 0 0 '
            f'0 1.415-1.414l-3.85-3.85a1 1 0 0 0-.115-.1zM12 6.5a5.5 5.5 0 1 1-11 0 5.5 5.5 0 0 1 11 0"/>'
            f'</svg>')


'''
assert 'def lupa(' not in s
s = s.replace('def boton(', LUPA + 'def boton(', 1)

# el boton acepta un icono a la izquierda, con el gap explicito del proyecto
viejo = """    return (f'<span style="{flex}height: {h}px; padding: 0 12px; display: inline-flex; '
            f'align-items: center; justify-content: center; border-radius: 7px; '
            f'background: {P["ink5"]}; border: 1px solid {P["ink4"]}; color: {P["ink0"]}; '
            f'font-size: {fs}px; font-weight: 600; white-space: nowrap">{txt}</span>')"""
nuevo = """    return (f'<span style="{flex}height: {h}px; padding: 0 12px; display: inline-flex; '
            f'align-items: center; justify-content: center; gap: 7px; border-radius: 7px; '
            f'background: {P["ink5"]}; border: 1px solid {P["ink4"]}; color: {P["ink0"]}; '
            f'font-size: {fs}px; font-weight: 600; white-space: nowrap">{txt}</span>')"""
assert viejo in s, 'no encontre el boton default'
s = s.replace(viejo, nuevo, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)

# ------------------------------------------------------------------ gen.py
p = 'gen.py'
s = io.open(p, encoding='utf-8').read()
s = s.replace('tabbar, fila_carta, filos_swipe, botones_juntos,',
              'tabbar, fila_carta, filos_swipe, botones_juntos, lupa,', 1)

viejo = """             f'{boton("\U0001f50d " + ("Diccionario" if movil else "Buscar en el diccionario"), h=30 if movil else 26, fs=13)}</div>'"""
nuevo = """             f'{boton(lupa(14) + ("Diccionario" if movil else "Buscar en el diccionario"), h=30 if movil else 26, fs=13)}</div>'"""
assert viejo in s, 'no encontre el boton del diccionario'
s = s.replace(viejo, nuevo, 1)

# Editar se va de escritorio: tocar la fila YA abre el editor -`onTap` de
# SwipeCardRow, que corre igual con mouse-, asi que el boton repetia un
# camino que la fila entera ya ofrece.
viejo = """                   + boton('Mover', h=22, fs=12) + boton('Editar', h=22, fs=12))"""
nuevo = """                   + boton('Mover', h=22, fs=12))"""
assert viejo in s, 'no encontre el boton editar'
s = s.replace(viejo, nuevo, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok lupa + editar')
