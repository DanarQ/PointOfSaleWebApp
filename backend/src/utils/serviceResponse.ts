import type { Response } from 'express'

/**
 * Common result type for service operations.
 * ok: true -> data is present.
 * ok: false -> status code and error message are present.
 */
export type ServiceResult<T> =
  | { ok: true; data: T }
  | { ok: false; status: number; error: string }

/**
 * Utility to handle service results in controllers.
 * Sends an error response if the result is not ok, or a success response with the data.
 */
export function handleServiceResponse<T>(
  res: Response,
  result: ServiceResult<T>,
  successStatus = 200,
) {
  if (!result.ok) {
    res.status(result.status).json({ error: result.error })
    return
  }

  res.status(successStatus).json(result.data)
}
