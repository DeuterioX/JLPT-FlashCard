/** Error de dominio con el status HTTP que le corresponde. */
export class AppError extends Error {
  constructor(message: string, public status: number) {
    super(message);
    this.name = 'AppError';
  }
}

export const notFound = (what: string) => new AppError(`${what} no encontrado`, 404);
export const forbidden = (why: string) => new AppError(why, 403);
export const badRequest = (why: string) => new AppError(why, 400);
