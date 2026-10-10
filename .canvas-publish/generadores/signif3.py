# -*- coding: utf-8 -*-
"""Arregla la barra superior y el ancho de los botones en telefono."""
import io

p = 'gen.py'
s = io.open(p, encoding='utf-8').read()

# 1. Las acciones salen como lista, y cada ancho las arma a su manera: en
#    telefono ocupan el ancho entero de la barra, no el de su texto.
viejo = """    if revelado:
        # El centro es SIEMPRE lo que hay que hacer ahora, igual que el input
        # en el quiz; la derecha es siempre con qué tecla.
        centro = (f'<span style="display: flex; align-items: center; gap: 10px">'
                  f'{boton("No la sabía", "shu", h=36, fs=14, crecer=movil)}'
                  f'{boton("La sabía", "primario", h=36, fs=14, crecer=movil)}</span>')
        der = (f'<span style="display: flex; align-items: center; gap: 8px; font-size: 12px; '
               f'color: {P["ink3"]}">{tecla("N")}no{tecla("S")}sí</span>')
    else:
        centro = boton('Ver significado', 'primario', h=36, fs=14, crecer=movil)
        der = (f'<span style="display: flex; align-items: center; gap: 8px; font-size: 12px; '
               f'color: {P["ink3"]}">{tecla("Espacio")}revelar</span>')

    if movil:
        # En teléfono no hay teclado físico: la columna de teclas no va.
        barra_inner = (f'{hudbox}<span style="display: flex; align-items: center; gap: 10px; '
                       f'width: 100%">{centro}</span>')
        caja = ('display: flex; flex-direction: column; align-items: center; justify-content: center; '
                'gap: 12px; padding: 12px')
    else:
        barra_inner = (f'<span style="justify-self: start">{hudbox}</span>{centro}'
                       f'<span style="justify-self: end">{der}</span>')
        caja = ('display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; '
                'gap: 16px; padding: 0 16px')"""
nuevo = """    if revelado:
        # El centro es SIEMPRE lo que hay que hacer ahora, igual que el input
        # en el quiz; la derecha es siempre con qué tecla.
        acciones = [boton('No la sabía', 'shu', h=36, fs=14, crecer=movil),
                    boton('La sabía', 'primario', h=36, fs=14, crecer=movil)]
        der = (f'<span style="display: flex; align-items: center; gap: 8px; font-size: 12px; '
               f'color: {P["ink3"]}">{tecla("N")}no{tecla("S")}sí</span>')
    else:
        acciones = [boton('Ver significado', 'primario', h=36, fs=14, crecer=movil)]
        der = (f'<span style="display: flex; align-items: center; gap: 8px; font-size: 12px; '
               f'color: {P["ink3"]}">{tecla("Espacio")}revelar</span>')

    if movil:
        # `crecer` pone `flex: 1 1 0` en cada botón, y eso reparte el ancho DEL
        # CONTENEDOR: sin un `width: 100%` acá, el contenedor mide lo que miden
        # los botones y no hay nada que repartir -quedaban chicos y pegados a
        # la izquierda-. Es el mismo `flex: 1 1 0` sin ancho que ya había
        # roto los botones de abajo del romaji.
        # En teléfono tampoco va la columna de teclas: no hay teclado físico.
        barra_inner = (f'{hudbox}<span style="display: flex; align-items: center; gap: 10px; '
                       f'width: 100%">{"".join(acciones)}</span>')
        caja = ('display: flex; flex-direction: column; align-items: center; justify-content: center; '
                'gap: 12px; padding: 12px')
    else:
        centro = (f'<span style="display: flex; align-items: center; gap: 10px">'
                  f'{"".join(acciones)}</span>')
        barra_inner = (f'<span style="justify-self: start">{hudbox}</span>{centro}'
                       f'<span style="justify-self: end">{der}</span>')
        caja = ('display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; '
                'gap: 16px; padding: 0 16px')"""
assert viejo in s, 'no encontre las acciones'
s = s.replace(viejo, nuevo, 1)

# 2. La barra superior no se parte: en telefono el contexto es corto y ni el
#    nombre de la app ni el rotulo envuelven.
viejo = """    esc = (f'<span style="display: flex; align-items: center; gap: 10px; font-size: 13px; color: {P["ink2"]}">'
           f'Minna no Nihongo I · Unidad 1'
           f'<span style="font-family: {MONO}; font-size: 12px; padding: 2px 6px; border-radius: 5px; '
           f'border: 1px solid {P["ink4"]}; border-bottom-width: 2px">Esc</span>salir</span>')
    top = (f'<div style="height: 48px; display: flex; align-items: center; justify-content: space-between; '
           f'padding: 0 16px; background: {P["ink6"]}; border-bottom: 1px solid {P["ink5"]}">'
           f'<span style="display: flex; align-items: center; gap: 9px; font-weight: 700; font-size: 15px">'
           f'<span style="font-size: 17px">🦊</span>Kitsune Cards</span>{esc}</div>')"""
nuevo = """    # «Minna no Nihongo I · Unidad 1» no entra en 390px: partía en dos líneas,
    # empujaba la barra de 48 a 95px y el escenario -que arranca en un `top:
    # 48px` fijo- quedaba tapado. En teléfono va sólo el grupo, que es el dato
    # que cambia mientras practicás.
    contexto = 'Unidad 1' if movil else 'Minna no Nihongo I · Unidad 1'
    esc = (f'<span style="display: flex; align-items: center; gap: 10px; font-size: 13px; '
           f'color: {P["ink2"]}; white-space: nowrap">{contexto}'
           f'<span style="font-family: {MONO}; font-size: 12px; padding: 2px 6px; border-radius: 5px; '
           f'border: 1px solid {P["ink4"]}; border-bottom-width: 2px">Esc</span>salir</span>')
    top = (f'<div style="height: 48px; display: flex; align-items: center; justify-content: space-between; '
           f'gap: 12px; padding: 0 16px; background: {P["ink6"]}; '
           f'border-bottom: 1px solid {P["ink5"]}">'
           f'<span style="display: flex; align-items: center; gap: 9px; font-weight: 700; '
           f'font-size: 15px; white-space: nowrap">'
           f'<span style="font-size: 17px">🦊</span>Kitsune Cards</span>{esc}</div>')"""
assert viejo in s, 'no encontre la barra superior'
s = s.replace(viejo, nuevo, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
