# -*- coding: utf-8 -*-
"""La barra de Significados copia la del quiz: tecla + boton, a la derecha."""
import io

p = 'gen.py'
s = io.open(p, encoding='utf-8').read()

viejo = """    if revelado:
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
nuevo = """    # La acción va donde la pone el quiz: TECLA + BOTÓN, a la derecha de la
    # barra, con las medidas del quiz (h=30, fs=13). La primera versión tenía
    # el botón en el centro -donde el quiz tiene el input- y la tecla suelta
    # con la palabra «revelar» en texto apagado, y al lado del quiz se veía
    # como otra pantalla. El centro queda vacío porque acá no hay nada que
    # escribir, que es justamente de lo que se trata el modo.
    # «No la sabía» lleva el mismo botón que «Borrar el grupo» en los modales:
    # `peligro`, shu lleno. Es el par del verde de «La sabía», y las dos
    # respuestas pesan lo mismo en la barra.
    if revelado:
        der = (f'{tecla("N")}{boton("No la sabía", "peligro", h=30, fs=13)}'
               f'{tecla("S")}{boton("La sabía", "primario", h=30, fs=13)}')
    else:
        der = f'{tecla("Espacio")}{boton("Revelar", "primario", h=30, fs=13)}'

    if movil:
        barra_inner = (f'{hudbox}<span style="display: flex; align-items: center; gap: 8px; '
                       f'justify-content: center; width: 100%">{der}</span>')
        caja = ('display: flex; flex-direction: column; align-items: center; justify-content: center; '
                'gap: 12px; padding: 12px')
    else:
        barra_inner = (f'<span style="justify-self: start">{hudbox}</span><span></span>'
                       f'<span style="justify-self: end; display: flex; align-items: center; '
                       f'gap: 8px">{der}</span>')
        caja = ('display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; '
                'gap: 16px; padding: 0 16px')"""
assert viejo in s, 'no encontre la barra de significados'
s = s.replace(viejo, nuevo, 1)
io.open(p, 'w', encoding='utf-8', newline='\n').write(s)
print('ok')
