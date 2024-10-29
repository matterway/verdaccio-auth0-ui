import { IPluginMiddleware } from "@verdaccio/types";
import { Application, Handler, Request } from "express";
import { parse, format } from "url";

import { authorizePath, callbackPath } from "../../constants";
import { logger } from "../../logger";
import { buildStatusPage } from "../../statusPage";
import { AuthCore } from "../plugin/AuthCore";
import { AuthProvider } from "../plugin/AuthProvider";
import { Verdaccio } from "../verdaccio";

export const errorPage = buildStatusPage(`
  <h1>Access Denied</h1>
  <p>Not enough permissions to access registry.</p>
  <p><a href="/">Go back</a></p>
`);

export class WebFlow implements IPluginMiddleware<any> {
  static getAuthorizePath(id?: string) {
    return authorizePath + "/" + (id || ":id?");
  }

  static getCallbackPath(id?: string) {
    return callbackPath + (id ? "/" + id : "");
  }

  constructor(
    private readonly verdaccio: Verdaccio,
    private readonly core: AuthCore,
    private readonly provider: AuthProvider
  ) {}

  /**
   * IPluginMiddleware
   */
  register_middlewares(app: Application) {
    app.get(WebFlow.getAuthorizePath(), this.authorize);
    app.get(WebFlow.getCallbackPath(), this.callback);
  }

  /**
   * Initiates the auth flow by redirecting to the provider's login URL.
   */
  authorize: Handler = async (req, res, next) => {
    try {
      const redirectUrl = this.getRedirectUrl(req);
      const url = await this.provider.getLoginUrl(redirectUrl);
      res.redirect(url);
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };

  /**
   * After successful authentication, the auth provider redirects back to us.
   * We use the code in the query params to get an access token and the username
   * associated with the account.
   *
   * We issue a JWT using these values and pass them back to the frontend as
   * query parameters so they can be stored in the browser.
   *
   * The username and token are encrypted and base64 encoded to form a token for
   * the npm CLI.
   *
   * There is no need to later decode and decrypt the token. This process is
   * automatically reversed by verdaccio before passing it to the plugin.
   */
  callback: Handler = async (req, res, next) => {
    try {
      const code = await this.provider.getCode(req);
      const token = await this.provider.getToken(code, this.getRedirectUrl(req));
      const username = await this.provider.getUsername(token);
      const groups = await this.provider.getGroups(token);

      if (this.core.canAuthenticate(username, groups)) {
        const ui = await this.core.createUiCallbackUrl(username, groups, token);
        res.redirect(ui);
      } else {
        res.send(errorPage);
      }
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };

  /**
   * Constructs the redirect URL and validates it against a whitelist.
   */
  private getRedirectUrl(req: Request): string {
    const baseUrl = this.verdaccio.baseUrl || this.getRequestOrigin(req);
    const path = WebFlow.getCallbackPath(req.params.id);

    // Parse and validate the redirect path
    const parsedUrl = parse(path);
    const VALID_REDIRECT_PATHS = new Set(["/oauth/authorize", "/oauth/callback", "/auth/error", "/"]);
    if (!VALID_REDIRECT_PATHS.has(parsedUrl.pathname || "")) {
      throw new Error("Invalid redirect path");
    }

    return format({
      protocol: parsedUrl.protocol || baseUrl.split("://")[0],
      host: parsedUrl.host || baseUrl.split("://")[1],
      pathname: parsedUrl.pathname,
    });
  }

  /**
   * Gets the origin for requests, validating headers to prevent injection.
   */
  private getRequestOrigin(req: Request): string {
    const protocol = req.get("X-Forwarded-Proto") || req.protocol;
    const host = req.get("host");

    // Whitelist accepted protocols and sanitize the host header
    const safeProtocol = protocol === "http" || protocol === "https" ? protocol : "http";
    const safeHost = host && /^[\w.-]+$/.test(host) ? host : "localhost";

    return `${safeProtocol}://${safeHost}`;
  }
}
