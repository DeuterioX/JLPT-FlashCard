import { createTheme, type MantineColorsTuple } from '@mantine/core';

// Índigo profundo, no negro. Reemplaza el `dark` gris neutro de Mantine.
// Mantine deriva de este array TODAS sus variables semánticas, así que
// redefinirlo alcanza para que cada componente se acomode solo.
// Ojo con el orden: en la escala de Mantine el 6 es MÁS CLARO que el 7.
const dark: MantineColorsTuple = [
  '#E9EBF4', // 0 → --mantine-color-text
  '#C3C8DC', // 1
  '#868DA8', // 2 → texto atenuado
  '#5D6480', // 3 → placeholders
  '#2C3249', // 4 → --mantine-color-default-border
  '#212639', // 5 → hover
  '#181C2E', // 6 → --mantine-color-default (superficies)
  '#0F1220', // 7 → --mantine-color-body (fondo de página)
  '#0B0E19', // 8
  '#070912', // 9
];

// Acción y acierto. Generado desde #3FBF8F con el generador de Mantine.
const jade: MantineColorsTuple = [
  '#E9F9F2', '#CDEFE2', '#A6E2CB', '#7BD4B2', '#57C79D',
  '#4BC796', '#3FBF8F', '#339C76', '#27795C', '#1A5641',
];

// Error. Generado desde #E2604A.
const shu: MantineColorsTuple = [
  '#FDEEEB', '#F9D6CF', '#F2B4A7', '#EC917F', '#E7755F',
  '#E56B55', '#E2604A', '#C74E3A', '#A43D2C', '#7F2C1F',
];

export const theme = createTheme({
  primaryColor: 'jade',
  // Mantine usa el shade 8 en dark por defecto, que apaga demasiado el jade.
  primaryShade: { light: 6, dark: 6 },
  colors: { dark, jade, shu },
  fontFamily: '"IBM Plex Sans", system-ui, -apple-system, sans-serif',
  fontFamilyMonospace: '"IBM Plex Mono", ui-monospace, monospace',
  headings: { fontFamily: '"Zen Kaku Gothic New", "IBM Plex Sans", sans-serif' },
  defaultRadius: 'sm',
});
