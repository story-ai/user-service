export interface Result<T = any>
	extends Promise<{ statusCode: number; result: T }> {}
