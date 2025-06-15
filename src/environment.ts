export const environment: 'prod' | 'dev' = 'dev';
export function whenDev(func: () => void) {
  if(environment === 'dev') func();
}

export function whenProd(func: () => void) {
  if(environment === 'prod') func();
}
