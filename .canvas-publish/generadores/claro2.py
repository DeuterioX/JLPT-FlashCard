# -*- coding: utf-8 -*-
"""Paso 2: Tokens documenta el tema en el que se dibuja, y el lienzo se emite
dos veces -oscuro y claro- con los mismos generadores."""
import io

p = 'build.py'
s = io.open(p, encoding='utf-8').read()

# ---------------------------------------------------------------- Tokens
viejo = """    INK = [('#EFEBE0', '0 · texto', 93.1), ('#CDD3C9', '1', 83.9), ('#9BA49B', '2 · atenuado', 66.4),
           ('#6E7570', '3 · placeholder', 48.5), ('#3A433D', '4 · borde', 27.4), ('#272E29', '5 · hover', 18.1),
           ('#1B211D', '6 · superficie', 12.0), ('#111513', '7 · fondo', 6.3), ('#0C0F0D', '8', 4.1),
           ('#080A09', '9', 2.6)]
    rampa = ''
    for hexa, rol, L in INK:
        col = P['sumi'] if L > 55 else '#D6D1C4'"""
nuevo = """    # La escala sale de `P` y el L* se calcula, en vez de estar copiado a
    # mano: así el tablero describe el tema en el que se está dibujando y no
    # hay una segunda copia de la paleta que se pueda desincronizar.
    def lstar(hexa):
        def lin(c):
            c = int(hexa[c:c + 2], 16) / 255
            return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4
        Y = 0.2126 * lin(1) + 0.7152 * lin(3) + 0.0722 * lin(5)
        return 116 * Y ** (1 / 3) - 16 if Y > 0.008856 else 903.3 * Y

    ROLES = ['0 · texto', '1', '2 · atenuado', '3 · placeholder', '4 · borde',
             '5 · hover', '6 · superficie', '7 · fondo', '8', '9']
    INK = [(P[f'ink{i}'], rol, lstar(P[f'ink{i}'])) for i, rol in enumerate(ROLES)]
    rampa = ''
    for hexa, rol, L in INK:
        col = P['sumi'] if L > 55 else '#D6D1C4'"""
assert viejo in s, 'no encontre la rampa'
s = s.replace(viejo, nuevo, 1)

viejo = """          ('', 'Papel apagado', P['papelOff'], 'El mismo papel, sin elegir. 32 puntos de L* debajo.', '#23211C'),"""
nuevo = """          ('', 'Papel apagado', P['papelOff'], 'El mismo papel, sin elegir.', P['papelInk']),"""
assert viejo in s, 'no encontre el papel apagado'
s = s.replace(viejo, nuevo, 1)

# ---------------------------------------------------------------- dos vueltas
i = s.index("y = 0\n")
j = s.index('# ---------------------------------------------------------------- canvas.json')
medio = s[i:j]

# `y = fila_de(y, ...)` -> una lista de datos que se puede recorrer dos veces
medio = medio.replace('y = 0\n', 'FILAS_DEF = []\n', 1)
medio = medio.replace('y = fila_de(y, ', 'FILAS_DEF.append((')
for alto in ('900', '844', '620'):
    medio = medio.replace(f'\n], {alto})\n', f'\n], {alto}))\n')
assert 'fila_de' not in medio, 'quedo alguna llamada a fila_de'

COLA = '''

def emitir_tema(nombre_tema, y0, prefijo, sufijo):
    """Dibuja el lienzo entero con el tema pedido.

    Los generadores no saben de temas: leen `P[...]` cuando dibujan, así que
    alcanza con cambiar el tema antes de la vuelta. El archivo lleva prefijo
    para que la versión clara no pise a la oscura.
    """
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
tema('oscuro')

'''
s = s[:i] + medio + COLA + s[j:]
s = s.replace('from lib import (P, UI,', 'from lib import (P, tema, UI,', 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok paso 2')
