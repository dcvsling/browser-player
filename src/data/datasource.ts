import { Observable } from "rxjs";

export namespace Constant {
  export interface Direction {
    Ascending: 'asc',
    Descending: 'desc'
  }
}

export interface DataSourceConnectOptions<T> {
  paging: {
    size?: number;
    index?: number;
  }
  filter?: { [P in keyof T]: null | string | number | boolean | Date | object | Array<null | string | number | boolean | Date | object >};
  sort?: ([keyof T, keyof Constant.Direction])[];
  disconnect?: boolean;
}

export interface DataSource<T> {
  connect(optionsObservable: Observable<DataSourceConnectOptions<T>>): Observable<readonly T[]>;}
