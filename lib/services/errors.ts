/** Error de dominio con el status HTTP que le corresponde. */
export class AppError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'AppError';
  }
}

// La construcción "No se encontró X" funciona para cualquier género del
// sustantivo que se pase ('el mazo', 'el grupo', 'la carta'), a diferencia de
// "X no encontrado" que solo concordaba con masculino.
export const notFound = (what: string) => new AppError(`No se encontró ${what}`, 404);
export const forbidden = (why: string) => new AppError(why, 403);
export const badRequest = (why: string) => new AppError(why, 400);
