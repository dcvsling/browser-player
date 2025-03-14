import { ApiRequest } from "./api";
import { CODE_WITH_PKCE, CODE_WITH_PKCE_EXPIRE, CODE_WITH_PKCE_EXPIRE_TIME, STATE } from "./Constant";
import { GetCodeWithPKCEResponse } from "./models";
import { GetAccessTokenOptions } from "./options";
import { fromQueryParams } from "./utils";


export function RequestCodeWithPKCE(options: GetAccessTokenOptions) {
  var expire = localStorage.getItem(CODE_WITH_PKCE_EXPIRE);
  
  if(!expire || parseFloat(expire) < Date.now()) {
    localStorage.clear();
    const state = generateState(5);
    localStorage.setItem(STATE, state);
    const params = [
      ['client_id', options.client_id],
      ['response_type', options.GetCodeRequestParameters.response_type],
      ['redirect_uri', options.GetCodeRequestParameters.redirect_uri],
      ['response_mode', options.GetCodeRequestParameters.response_mode],
      ['scope', encodeURIComponent(options.scope.join(' '))],
      ['state', state],
      ['code_challenge', options.GetCodeRequestParameters.code_challenge],
      ['code_challenge_metod', options.GetCodeRequestParameters.code_challenge_method],
    ].map(kvp => kvp.join('=')).join('&');
    location.href = ApiRequest.Authorize.endpoint + '?' + params;
  }
}

export function ensureCodeWithPKCE(options: GetAccessTokenOptions) {
  const expire = localStorage.getItem(CODE_WITH_PKCE_EXPIRE);
  if(!expire || parseFloat(expire) < Date.now()) {
    RequestCodeWithPKCE(options);
  }
}

export function HandleCodeWithPKCE(): boolean {
  if(location.search.startsWith('?code=')) {
    var res = fromQueryParams<GetCodeWithPKCEResponse>(location.search);
    if(res.state !== localStorage.getItem(STATE))
      return false;
    localStorage.setItem(CODE_WITH_PKCE, JSON.stringify(res));
    localStorage.setItem(CODE_WITH_PKCE_EXPIRE, (Date.now() + CODE_WITH_PKCE_EXPIRE_TIME).toString());
    return true;
  }
  localStorage.removeItem(CODE_WITH_PKCE);
  localStorage.removeItem(CODE_WITH_PKCE_EXPIRE);
  return false;
}

function generateState(length: number): string {
  return generateStateRecurse('', length).toString();
}

function generateStateRecurse(current: string, length: number): string {
  return length === current.length ? current : generateStateRecurse(current + Math.floor(Math.random()*10).toString(), length);
}

