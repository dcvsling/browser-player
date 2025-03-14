import { InjectionToken } from "@angular/core";
import { GetAccessTokenRequest, GetCodeWithPKCERequest, RefreshAccessTokenRequest } from "./models";

type ShareOptions = GetCodeWithPKCERequest & GetAccessTokenRequest & RefreshAccessTokenRequest

interface GetAccessTokenOptions {
  client_id: string,
  scope: string[],
  GetCodeRequestParameters: Partial<GetCodeWithPKCERequest>;
  GetAcccessTokenParemeters: Partial<GetAccessTokenRequest>;
  RefreshAccessTokenParameters: Partial<RefreshAccessTokenRequest>;
}
const GetAccessTokenOptions = new InjectionToken<GetAccessTokenOptions>('get access token options');
export { GetAccessTokenOptions };
