# -*- coding: utf-8 -*-
"""La celda pasa a medir un entero PAR de pixeles, para que todas las lineas
de la cuadricula caigan en la misma fase de subpixel y se rendericen iguales."""
import io

p = 'lib.py'
s = io.open(p, encoding='utf-8').read()

viejo = """    lado = min(lado_max, disponible / ancho_fila)
    fuente = lado * 0.62"""
nuevo = """    # Entero PAR, no el float que sale de la división. Con un lado
    # fraccionario -99,8px medidos- cada borde de la cuadrícula cae en una
    # fase de subpíxel distinta (221,016 · 320,813 · 420,61 …), y el navegador
    # redondea cada línea para su lado: unas quedan de un píxel y otras de
    # dos, que al zoom del lienzo se ven de uno contra tres. Con un lado
    # entero todas las líneas comparten la misma fase y se dibujan iguales.
    # Par además de entero porque la cruz de guía va en `left/top: 50%`: con
    # un lado impar ese 50% cae en medio píxel y la guía sale difusa.
    lado = int(min(lado_max, disponible / ancho_fila)) // 2 * 2
    fuente = lado * 0.62"""
assert viejo in s
s = s.replace(viejo, nuevo)

# el lado ya es entero: sin decimal en el CSS
viejo = """            celdas += (f'<span style="width: {lado:.1f}px; height: {lado:.1f}px; position: relative; '"""
nuevo = """            celdas += (f'<span style="width: {lado}px; height: {lado}px; position: relative; '"""
assert viejo in s
s = s.replace(viejo, nuevo)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok lado entero par')
