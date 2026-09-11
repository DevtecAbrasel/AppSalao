export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }

  static badRequest(message: string) {
    return new ApiError(400, message);
  }

  static notFound(message: string) {
    return new ApiError(404, message);
  }

  static unauthorized(message: string) {
    return new ApiError(401, message);
  }

  // 401 = "não sei quem você é"; 403 = "sei quem você é e não pode".
  static forbidden(message: string) {
    return new ApiError(403, message);
  }

  static conflict(message: string) {
    return new ApiError(409, message);
  }

  // 503 = o pedido está certo, mas este recurso do servidor não está de pé
  // agora (recurso opcional sem configuração, dependência externa fora do ar).
  static serviceUnavailable(message: string) {
    return new ApiError(503, message);
  }
}
