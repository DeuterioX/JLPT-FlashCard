# -*- coding: utf-8 -*-
"""Cada pantalla queda con su oscura y su clara pegadas, en vez de dos
secciones separadas."""
import io

p = 'build.py'
s = io.open(p, encoding='utf-8').read()

viejo = """def emitir_tema(nombre_tema, y0, prefijo, sufijo):
    \"\"\"Dibuja el lienzo entero con el tema pedido.

    Los generadores no saben de temas: leen `P[...]` cuando dibujan, así que
    alcanza con cambiar el tema antes de la vuelta. El archivo lleva prefijo
    para que la versión clara no pise a la oscura.
    \"\"\"
    tema(nombre_tema)
    y = y0
    for titulo, items, alto in FILAS_DEF:
        conprefijo = [(prefijo + arch, tit + sufijo, fn, dim) for arch, tit, fn, dim in items]
        y = fila_de(y, titulo + sufijo, conprefijo, alto)
    return y


y = emitir_tema('oscuro', 0, '', '')
# Un hueco más grande que el de una fila cualquiera: acá no cambia la pantalla,
# cambia el tema, y eso tiene que leerse como otra sección del lienzo.
y = emitir_tema('claro', y + 900, 'Cl', ' · claro')
tema('oscuro')"""
nuevo = """# Dentro de un par -la misma pantalla en los dos temas- el hueco es un tercio
# del que hay entre pantallas distintas. Es lo único que dice que esas dos son
# la misma cosa: pegadas se comparan de un vistazo, y el hueco grande de al
# lado corta antes de que empiece la pantalla siguiente.
PAR = 30


def emitir_pares(y0):
    \"\"\"Dibuja cada pantalla dos veces seguidas, oscura y clara.

    Los generadores no saben de temas: leen `P[...]` cuando dibujan, así que
    alcanza con cambiar el tema entre una y otra. La clara lleva prefijo en el
    archivo para no pisar a la oscura.
    \"\"\"
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
tema('oscuro')"""
assert viejo in s, 'no encontre emitir_tema'
s = s.replace(viejo, nuevo, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
