# -*- coding: utf-8 -*-
"""Registra los cuatro tableros de Significados en el lienzo."""
import io

p = 'build.py'
s = io.open(p, encoding='utf-8').read()

s = s.replace('from gen import emitir, marco, practica, mazos, grupos, cartas, quiz, stats, BOARDS',
              'from gen import (emitir, marco, practica, mazos, grupos, cartas, quiz, significados,\n'
              '                 stats, BOARDS)', 1)

WRAP = '''def signif_d(w, h):
    return significados(w, h)


def signif_rev_d(w, h):
    return significados(w, h, revelado=True)


def signif_m(w, h):
    return significados(w, h)


def signif_rev_m(w, h):
    return significados(w, h, revelado=True)


'''
marca = 'y = fila_de(y, \'Escritorio · 1440×900\', ['
assert marca in s, 'no encontre la primera fila'
s = s.replace(marca, WRAP + marca, 1)

viejo = """y = fila_de(y, 'Modales · crear, renombrar, borrar', ["""
nuevo = """y = fila_de(y, 'Repasar el significado, sin escribir', [
    ('EscSignif.dc.html', 'Significados · escritorio', signif_d, D),
    ('EscSignifRev.dc.html', 'Significados revelado · escritorio', signif_rev_d, D),
    ('TelSignif.dc.html', 'Significados · teléfono', signif_m, M),
    ('TelSignifRev.dc.html', 'Significados revelado · teléfono', signif_rev_m, M),
], 900)

y = fila_de(y, 'Modales · crear, renombrar, borrar', ["""
assert viejo in s, 'no encontre la fila de modales'
s = s.replace(viejo, nuevo, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok build')
