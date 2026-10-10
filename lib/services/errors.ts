import es from '../i18n/messages/es.json';

type ServerError = keyof typeof es.errors.server;
type Thing = keyof typeof es.errors.notFound;

/**
 * Error de dominio con el status HTTP que le corresponde. `key` es su clave en
 * los mensajes (`errors.…`): la API lo traduce al idioma de quien pidió. El
 * `message` queda en castellano, para los logs y los tests.
 */
export class AppError extends Error {
  constructor(message: string, public status: number, public key?: string) {
    super(message);
    this.name = 'AppError';
  }
}

export const appError = (key: ServerError, status: number) =>
  new AppError(es.errors.server[key], status, `server.${key}`);
export const notFound = (what: Thing) => new AppError(es.errors.notFound[what], 404, `notFound.${what}`);
export const forbidden = (key: ServerError) => appError(key, 403);
export const badRequest = (key: ServerError) => appError(key, 400);
