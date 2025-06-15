
export interface GetCodeWithPKCERequest {
  client_id: string
  response_type: "code"
  redirect_uri: string
  response_mode: "query"
  scope: string
  state: string
  code_challenge: string
  code_challenge_method: string
}
export interface GetCodeWithPKCEResponse {
  code: string
  state: string
}

export interface GetAccessTokenRequest {
  client_id: string
  scope?: string
  code: string
  redirect_uri: string
  grant_type: "authorization_code"
  code_verifier: string
}

export interface GetAccessTokenResponse {
  access_token: string,
  token_type: string,
  expires_in: number,
  scope: string,
  refresh_token: string,
  id_token: string;
}

export interface RefreshAccessTokenRequest {
  client_id: string
  scope: string
  refresh_token: string
  grant_type: 'refresh_token'
}

