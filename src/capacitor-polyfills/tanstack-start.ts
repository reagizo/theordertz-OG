// Capacitor polyfill for @tanstack/react-start
// Replaces server functions with localStorage-based mocks for client-only builds

interface ServerFnOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE'
}

interface ServerFn {
  handler: (fn: (...args: any[]) => any) => ServerFn
  (...args: any[]): Promise<any>
}

function createServerFn(_options?: ServerFnOptions): ServerFn {
  const fn: any = async () => []
  
  fn.handler = (handlerFn: (...args: any[]) => any) => {
    const wrapped: any = async (...args: any[]) => handlerFn(...args)
    return wrapped
  }
  
  return fn
}

export { createServerFn }
export type { ServerFnOptions, ServerFn }
