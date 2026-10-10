# -*- coding: utf-8 -*-
"""El artboard del giro, al día: sobre X, sin perspectiva, la curva nueva y
los dos modos. Y el de «Revelar el significado · 180 ms» sale del índice:
Significados ya no tiene una animación propia, usa el mismo giro."""
import pathlib

B = pathlib.Path('build.py')
b = B.read_text(encoding='utf-8')

ini = b.index('def anim_giro(w, h):')
fin = b.index('def anim_revelar(w, h):')
nuevo = '''def anim_giro(w, h):
    """El giro del revelar, cuadro a cuadro con la curva real.

    Gira sobre el eje X y SIN perspectiva, así que lo que se ve es la hoja
    aplastándose en vertical sobre su centro: el alto proyectado es |cos θ|.
    θ sale de la curva de la app, cubic-bezier(0.4, 0.2, 0.6, 0.8) en 380 ms,
    resuelta acá mismo para cada cuadro.
    """
    import math

    def bezier(t, p1x=0.4, p1y=0.2, p2x=0.6, p2y=0.8):
        # x(s) = t por bisección, después y(s).
        lo, hi = 0.0, 1.0
        for _ in range(60):
            s = (lo + hi) / 2
            x = 3 * (1 - s) ** 2 * s * p1x + 3 * (1 - s) * s ** 2 * p2x + s ** 3
            lo, hi = (s, hi) if x < t else (lo, s)
        s = (lo + hi) / 2
        return 3 * (1 - s) ** 2 * s * p1y + 3 * (1 - s) * s ** 2 * p2y + s ** 3

    cuadros = []
    for ms in [0, 95, 160, 190, 220, 285, 380]:
        ang = 180 * bezier(ms / 380)
        esc = abs(math.cos(math.radians(ang)))
        frente = ang < 90
        rot = {0: 'reposo', 380: '380 ms · revelado'}.get(ms, f'{ms} ms')
        if 88 <= ang <= 92:
            rot += ' · canto'
        if frente:
            contenido = (f'<span style="font-family: {MINCHO}; font-size: 64px; color: {P["sumi"]}; '
                         f'line-height: 1">あ</span>')
        else:
            contenido = (f'<span style="font-family: {MONO}; font-size: 26px; color: {P["sumi"]}; line-height: 1">a</span>')
        cuadros.append(
            f'<div style="display: flex; flex-direction: column; align-items: center; gap: 8px">'
            f'<div style="width: 130px; height: 130px; display: grid; place-items: center">'
            f'<div style="width: 130px; height: 130px; background: {P["papel"]}; border-radius: 3px; '
            f'display: flex; flex-direction: column; align-items: center; justify-content: center; '
            f'transform: scaleY({esc:.3f}); box-shadow: {P["sombraCuadro"]}; overflow: hidden">'
            f'{contenido if esc > 0.12 else ""}</div></div>'
            f'<span style="font-family: {MONO}; font-size: 10px; color: {P["ink3"]}">{rot}</span>'
            f'<span style="font-family: {MONO}; font-size: 10px; color: {P["ink4"]}">{ang:.0f}°</span></div>')
    tira = f'<div style="display: flex; gap: 22px; align-items: flex-start">{"".join(cuadros)}</div>'

    def p(t):
        return f'<p style="margin: 0; font-size: 12.5px; color: {P["ink2"]}; max-width: 82ch; line-height: 1.6">{t}</p>'

    b_ = lambda t: f'<b style="color: {P["ink0"]}">{t}</b>'
    nota = (p(f'La hoja gira {b_("sobre el eje X")} -cae hacia adelante y sube por atrás- y el dorso es la misma '
              f'hoja con la lectura y el significado. Es el revelar de {b_("las dos rondas")}: Escribir y '
              f'Significados usan el mismo componente.')
            + p(f'{b_("Sin perspectiva")}: con perspectiva el borde que viene hacia la cámara se mueve más que el '
                f'que se aleja y la cara se corre. Sin ella el giro es un aplastado parejo sobre el centro. '
                f'{b_("380 ms")} con una curva casi lineal en el medio, cubic-bezier(0.4, 0.2, 0.6, 0.8): el tramo '
                f'de canto, que es donde cambia la cara, pasa en seis cuadros y no en cuatro.')
            + p(f'La carta vive {b_("siempre en su propia capa")} de GPU. Con el escalado de Windows al 125% la '
                f'promoción a capa al arrancar el giro la corría un píxel de costado. Y cada carta nueva entra '
                f'{b_("de frente y sin animar")}: si no, al calificar una revelada, la vuelta mostraba la '
                f'respuesta de la siguiente.'))
    cuerpo = (f'<div style="padding: 32px; display: flex; flex-direction: column; gap: 22px">'
              f'<div style="display: flex; flex-direction: column; gap: 6px">'
              f'<span style="font-family: {MINCHO}; font-size: 22px">翻 · Revelar</span>'
              f'<span style="font-size: 12px; color: {P["ink3"]}">Escribir y Significados · 380 ms</span></div>'
              f'{tira}{nota}</div>')
    return marco(w, h, cuerpo)


'''
b = b[:ini] + nuevo + b[fin:]
assert "('AnimGiro.dc.html', 'Revelar · 380 ms', anim_giro, (1240, 420))," in b
b = b.replace("('AnimGiro.dc.html', 'Revelar · 380 ms', anim_giro, (1240, 420)),",
              "('AnimGiro.dc.html', 'Revelar · 380 ms', anim_giro, (1240, 600)),")
B.write_text(b, encoding='utf-8')
print('listo')
