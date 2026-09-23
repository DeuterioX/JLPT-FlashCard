import { Breadcrumb, type Crumb } from './Breadcrumb';
import { MobileNavbar } from './MobileNavbar';

/**
 * La cabecera de una pantalla, en sus dos formas: barra arriba en teléfono y
 * miga dentro del contenido en escritorio.
 *
 * La pantalla declara UNA sola lista de niveles y acá se deriva lo que cada
 * forma necesita. Con `title` y `trail` por separado se estaría escribiendo
 * dos veces lo mismo -el título ES el último nivel- y podrían contradecirse;
 * así no hay dónde derivar.
 *
 * Las dos formas se renderizan siempre y el CSS elige cuál se ve: con
 * `useMediaQuery` el servidor y el cliente emitirían marcado distinto. Se
 * oculta con `display: none` y no con `visibility` ni `opacity`, porque
 * `display: none` sí saca el elemento del árbol de accesibilidad -si no, un
 * lector de pantalla anunciaría la misma navegación dos veces-.
 */
export function Navbar({
  id, levels, currentClassName, currentId, action,
}: {
  id?: string;
  /** De la raíz hacia acá. El ÚLTIMO es dónde estás, y no lleva `href`. */
  levels: (Crumb | { label: string; href?: string })[];
  /** `kana` donde el nivel actual es una palabra japonesa. */
  currentClassName?: string;
  currentId?: string;
  action?: React.ReactNode;
}) {
  const current = levels[levels.length - 1];
  const trail = levels.slice(0, -1).filter((l): l is Crumb => Boolean(l.href));
  // El nivel inmediatamente anterior. Si no hay, es la raíz y no lleva flecha.
  const up = trail.length > 0 ? trail[trail.length - 1] : undefined;

  return (
    <>
      <MobileNavbar up={up} title={current.label} action={action} />
      <Breadcrumb
        id={id}
        trail={trail}
        current={current.label}
        currentClassName={currentClassName}
        currentId={currentId}
      >
        {action}
      </Breadcrumb>
    </>
  );
}
