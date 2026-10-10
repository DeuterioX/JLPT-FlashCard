# -*- coding: utf-8 -*-
"""Reescribe `stats` con la distribución real de la app."""
import io

NUEVA = '''# ============================================================ ESTADÍSTICAS
# Aciertos por grupo, tal cual los devuelve la app hoy.
POR_GRUPO = [('Serie NY', 0), ('Serie G', 0), ('Serie B', 0), ('Serie MY', 0),
             ('Serie Z', 0), ('Serie CH', 0), ('Serie GY', 0), ('Unidad 1', 0),
             ('Serie SH', 50), ('Serie H', 53)]


def stats(w, h):
    movil = w < 600

    def tono(p):
        return P['verde'] if p >= 85 else ('#C8A23E' if p >= 60 else P['shu'])

    def panel(titulo, nota, filas):
        return (f'<div style="background: {P["ink6"]}; border: 1px solid {P["ink5"]}; '
                f'border-radius: 9px; padding: 13px; display: flex; flex-direction: column; gap: 8px">'
                f'<span style="display: flex; align-items: baseline; gap: 10px">'
                f'<span style="flex: 1; font-size: 11.5px; font-weight: 700">{titulo}</span>'
                f'<span style="font-size: 10.5px; color: {P["ink3"]}">{nota}</span></span>'
                f'{filas}</div>')

    tiles = ''
    for lab, val, sub, col in [('Aciertos', '67%', '204 de 303', tono(67)),
                               ('Errores', '99', 'en 30 días', P['shu']),
                               ('Rondas', '18', '0,6 por día', P['ink0']),
                               ('Dominadas', '1', 'de 384 cartas', P['ink0'])]:
        tiles += (f'<div style="background: {P["ink6"]}; border: 1px solid {P["ink5"]}; '
                  f'border-radius: 8px; padding: 11px 13px; display: flex; flex-direction: column; gap: 1px">'
                  f'<span style="font-size: 9px; letter-spacing: .06em; text-transform: uppercase; '
                  f'color: {P["ink3"]}">{lab}</span>'
                  f'<span style="font-size: 21px; font-weight: 700; color: {col}">{val}</span>'
                  f'<span style="font-size: 10.5px; color: {P["ink3"]}">{sub}</span></div>')
    tilebox = (f'<div style="display: grid; grid-template-columns: repeat({2 if movil else 4}, 1fr); '
               f'gap: 9px">{tiles}</div>')

    peores = ''
    for k, r, err, tot in PEORES[:8 if movil else 6]:
        pct = round(err / tot * 100)
        peores += (f'<div style="display: flex; align-items: center; gap: 9px; font-size: 11px">'
                   f'<span style="width: 24px; font-family: {KANA}; font-size: 16px">{k}</span>'
                   f'<span style="width: 32px; font-family: {MONO}; color: {P["ink2"]}">{r}</span>'
                   f'<span style="flex: 1; height: 4px; border-radius: 2px; background: {P["ink5"]}; '
                   f'overflow: hidden"><span style="display: block; height: 4px; width: {pct}%; '
                   f'background: {P["shu"]}"></span></span>'
                   f'<span style="color: {P["ink3"]}; font-family: {MONO}; width: 38px; '
                   f'text-align: right">{err}/{tot}</span></div>')

    grupos_f = ''
    for nombre, pct in POR_GRUPO[:7 if movil else 10]:
        grupos_f += (f'<div style="display: flex; align-items: center; gap: 9px; font-size: 11px">'
                     f'<span style="width: 62px; color: {P["ink2"]}">{nombre}</span>'
                     f'<span style="flex: 1; height: 6px; border-radius: 3px; background: {P["ink5"]}; '
                     f'overflow: hidden"><span style="display: block; height: 6px; width: {pct}%; '
                     f'background: {tono(pct)}"></span></span>'
                     f'<span style="color: {P["ink2"]}; font-family: {MONO}; width: 30px; '
                     f'text-align: right">{pct}%</span></div>')

    hist = ''
    for fecha, dur, pct in HISTORIAL[:5 if movil else 7]:
        hist += (f'<div style="display: flex; align-items: baseline; gap: 10px; padding: 4px 0; '
                 f'font-size: 11.5px">'
                 f'<span style="font-family: {MONO}; color: {P["ink2"]}">{fecha}</span>'
                 f'<span style="flex: 1; min-width: 0; color: {P["ink2"]}; overflow: hidden; '
                 f'text-overflow: ellipsis; white-space: nowrap">Hiragana · 1 grupo · 5 cartas</span>'
                 f'<span style="font-family: {MONO}; color: {P["ink2"]}">{dur}</span>'
                 f'<span style="width: 38px; text-align: right; font-weight: 500; '
                 f'color: {tono(pct)}">{pct}%</span></div>')

    seg = (f'<span style="display: inline-flex; padding: 3px; border-radius: 8px; '
           f'background: {P["ink5"]}">'
           f'<span style="padding: 5px 14px; border-radius: 6px; font-size: 12px; '
           f'color: {P["ink2"]}">7 días</span>'
           f'<span style="padding: 5px 14px; border-radius: 6px; font-size: 12px; '
           f'background: {P["ink7"]}; color: {P["ink0"]}">30 días</span>'
           f'<span style="padding: 5px 14px; border-radius: 6px; font-size: 12px; '
           f'color: {P["ink2"]}">Siempre</span></span>')
    cta = boton('Practicar mis 19 peores →', 'primario', h=36 if movil else 32, fs=13,
                crecer=movil)

    p1 = panel('Las que más errás', 'errores / veces vista', peores)
    p2 = panel('Aciertos por grupo', 'últimos 30 días', grupos_f)
    p3 = panel('Historial de rondas', 'últimas 5' if movil else 'últimas 7', hist)

    if movil:
        # El segmento va solo arriba y el botón a ancho completo abajo de los
        # tiles, como en la app: en una fila los dos, el botón se come el
        # segmento o lo empuja fuera de los 390px.
        cuerpo = (f'<div style="padding: 16px; display: flex; flex-direction: column; gap: 12px">'
                  f'<div style="display: flex">{seg}</div>{tilebox}'
                  f'<div style="display: flex">{cta}</div>{p1}{p2}{p3}</div>')
    else:
        cuerpo = (f'<div style="padding: 16px; display: flex; flex-direction: column; gap: 14px">'
                  f'<div style="display: flex; align-items: center; justify-content: space-between; '
                  f'gap: 12px">{seg}{cta}</div>{tilebox}'
                  f'<div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px">{p1}{p2}</div>'
                  f'{p3}</div>')

    top = navbar_movil('Estadísticas', atras=False) if movil else topbar('Estadísticas')
    return marco(w, h, top + cuerpo + (tabbar('Estadísticas') if movil else ''))
'''

p = 'gen.py'
s = io.open(p, encoding='utf-8').read()
i = s.index('# ============================================================ ESTADÍSTICAS')
io.open(p, 'w', encoding='utf-8', newline='\n').write(s[:i] + NUEVA)
print('stats reescrito')
