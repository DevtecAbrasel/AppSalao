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
}
