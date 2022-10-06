import { Config } from "@verdaccio/types"

import { Auth, User } from "../verdaccio"
import { getSecurity } from "./verdaccio-4-auth-utils"

function getBaseUrl(config: Config) {
  const prefix = config.url_prefix
  if (prefix) {
    return prefix.replace(/\/?$/, "") // Remove potential trailing slash
  }
  return ""
}

/**
 * Abstract Verdaccio version differences and usage of all Verdaccio objects.
 */
export class Verdaccio {
  readonly baseUrl = getBaseUrl(this.config)

  private auth!: Auth

  constructor(
    private readonly config: Config,
  ) { }

  setAuth(auth: Auth) {
    this.auth = auth
  }

  async issueNpmToken(username: string, token: string) {
    return this.encrypt(username + ":" + token)
  }

  async issueUiToken(user: User) {
    const jWTSignOptions = getSecurity(this.config).web.sign
    return this.auth.jwtEncrypt(user, jWTSignOptions)
  }

  private encrypt(text: string) {
    return this.auth.aesEncrypt(new Buffer(text)).toString("base64")
  }

}
