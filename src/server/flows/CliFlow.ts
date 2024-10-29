import { IPluginMiddleware } from "@verdaccio/types";
import { Application, Handler, Request } from "express";

import { logger } from "../../logger";
import { AuthCore } from "../plugin/AuthCore";
import { AuthProvider } from "../plugin/AuthProvider";
import { Verdaccio } from "../verdaccio";
import { errorPage, WebFlow } from "./WebFlow";
import { URL } from "url";

const cliAuthorizeUrl = "/oauth/authorize";
const cliCallbackUrl = "http://localhost:8239?token=";
const providerId = "cli";

const pluginAuthorizeUrl = WebFlow.getAuthorizePath(providerId);
const pluginCallbackUrl = WebFlow.getCallbackPath(providerId);

export class CliFlow implements IPluginMiddleware<any> {
  constructor(
    private readonly verdaccio: Verdaccio,
    private readonly core: AuthCore,
    private readonly provider: AuthProvider
  ) {}

  /**
   * IPluginMiddleware
   */
  register_middlewares(app: Application) {
    app.get(cliAuthorizeUrl, this.authorize);
    app.get(pluginCallbackUrl, this.callback);
  }

  authorize: Handler = async (req, res) => {
    res.redirect(pluginAuthorizeUrl);
  };

  callback: Handler = async (req, res, next) => {
    try {
      const code = await this.provider.getCode(req);
      const token = await this.provider.getToken(code, this.getRedirectUrl(req));
      const username = await this.provider.getUsername(token);
      const groups = await this.provider.getGroups(token);

      if (this.core.canAuthenticate(username, groups)) {
        const npmToken = await this.verdaccio.issueNpmToken(username, token);
        const cli = cliCallbackUrl + encodeURIComponent(npmToken);
        res.redirect(cli);
      } else {
        res.send(errorPage);
      }
    } catch (error) {
      logger.error(error);
      next(error);
    }
  };

  /**
   * Gets the origin for requests, validating headers to prevent injection.
   */
  private getRequestOrigin(req: Request): string {
    const protocol = req.get("X-Forwarded-Proto") || req.protocol;
    const host = req.get("host");
    const safeProtocol = protocol === "http" || protocol === "https" ? protocol : "http";
    const safeHost = host && /^[\w.-]+$/.test(host) ? host : "localhost";

    return `${safeProtocol}://${safeHost}`;
  }

  private getRedirectUrl(req: Request): string {
    const baseUrl = this.verdaccio.baseUrl || this.getRequestOrigin(req);
    const path = WebFlow.getCallbackPath(providerId);
    const parsedUrl = new URL(path, baseUrl);
    const VALID_REDIRECT_PATHS = new Set(["/oauth/authorize", "/oauth/callback", "/auth/error", "/"]);
    if (!VALID_REDIRECT_PATHS.has(parsedUrl.pathname)) {
      throw new Error("Invalid redirect path");
    }

    return parsedUrl.toString();
  }
}
