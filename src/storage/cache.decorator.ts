import { Observable, from, of, tap } from 'rxjs';
import './hash';
export function Cache(prefix: string = ''): MethodDecorator {
  return function<TFunc extends Function>(_: object, name: string | symbol, desc: PropertyDescriptor): void {
    desc.value = decoratedF(desc.value!);

    function decoratedF(original: Function): TFunc {
      return function(this: ThisType<any>, ...args: any) {
        const key = [...prefix.length === 0 ? [prefix] : [], name.toString(), ...[args.map((arg: any) => JSON.stringify(arg))]].join('_');
        const cached = localStorage.getItem(key);
        if (!!cached && cached?.trim().length !== 0) {
          const { type, data } = JSON.parse(cached);
          if (type === 'Promise') {
            return Promise.resolve(data);
          } else if (type === 'observable') {
            return of(data);
          } else {
            return data;
          }
        }
        const result = original.apply(this, args);
        if(result instanceof Promise) {
          return result.then(res => localStorage.setItem(key, JSON.stringify({ type: 'Promise', data: res })));
        } else if(result instanceof Observable) {
          return result.pipe(tap(res => localStorage.setItem(key, JSON.stringify({ type: 'observable', data: res }))));
        } else {
          localStorage.setItem(key, JSON.stringify({ type: 'primary' , data: result }));
          return result;
        }
      } as unknown as TFunc;
    };
  }
}
