import { EnvironmentProviders, makeEnvironmentProviders } from "@angular/core";
import { DataProvider } from "./data.provider";
import { LocalStorageProvider, LOCAL_STORAGE_NAME_TOKEN } from "./localStorage.provider";

export function provideLocalStorageDataProvider(name: string): EnvironmentProviders {
  return makeEnvironmentProviders([
    LocalStorageProvider,
    {
      provide: DataProvider,
      useExisting: LocalStorageProvider,
    },
    {
      provide: LOCAL_STORAGE_NAME_TOKEN,
      useValue: name
    }
  ]);
}
