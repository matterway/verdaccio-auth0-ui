<h1 align="center">
  📦🔐 Verdaccio Auth0 Connect - With UI Support
</h1>

## About

<img src="screenshots/authorize.png" align="right" width="270"/>

This is a Verdaccio plugin that offers OpenID Connect integration for both the browser and the command line.

### Features

- UI integration with fully functional login and logout. When clicking the login button the user is redirected to identity provider and returns with a working session.
- Updated usage info and working copy-to-clipboard for setup commands.
- A small CLI for quick-and-easy configuration.

### Compatibility

- Verdaccio 5
- Node 14, 16
- Chrome, Firefox, Firefox ESR, Edge, Safari

If you would like to use this with Verdaccio 3-4, Node.js 10-13, or IE you can use version 2 of the plugin.

## Setup

### Install

```
$ npm install verdaccio-auth0-ui
```

### Auth0 Config

On Auth0 management page:

- Create an App "Regular web application" with name `NPM Registry`
  - Allowed Callback URLs `YOUR_REGISTRY_URL/-/oauth/callback`
  - Allowed Logout URLs `YOUR_REGISTRY_URL`
- Create an API endpoint. Set API Audience to `https://yourprivateregistry.com/`
  - Enable RBAC = on
  - Add Permissions in the Access Token = on
  - Allow Skipping User Consent = on
  - Allow Offline Access = on
  - On tab Permissions add `read:packages` and `write:packages` permissions
- Create a User Role.
  - Assign both permissions of `https://yourprivateregistry.com/` to that Role.
- Assign created Role to a User.

![](screenshots/github-app.png)

### Verdaccio Config

Merge the below options with your existing Verdaccio config:

```yml
middlewares:
  oidc-auth0-ui:
    enabled: true

auth:
  oidc-auth0-ui:
    org: REQUIRED_PERMISSION
    client-id: OIDC_CLIENT_ID
    client-secret: OIDC_CLIENT_SECRET

    oidc-issuer-url: https://yourorg.eu.auth0.com
    oidc-audience: https://yourprivateregistry.com/
    oidc-userinfo-nickname-property: nickname
    oidc-access-token-permissions-property: permissions

url_prefix: YOUR_REGISTRY_URL
```

- The configured values can either be the actual value or the name of an environment variable that contains the value.
- The config props can be specified under either the `middlewares` or the `auth` node. Just make sure, the addon is included under both nodes.

#### `org`

Users within this group will be able to authenticate.

#### `client-id` and `client-secret`

These values can be obtained from Auth0 App page.

### `oidc-issuer-url`

The URL of your Auth0 endpoint. E.g. https://yourorg.eu.auth0.com

### `oidc-audience` (optional)

API Audience of your npm registry defined in Auth0. E.g. `https://yourprivateregistry.com/`

### `oidc-userinfo-nickname-property` (optional)

The userinfo key that represents a username with your identity provider. Defaults to `nickname`

### `oidc-access-token-permissions-property` (optional)

Permissions property stored in `access_token`. Defaults to `permissions`

#### `url_prefix` (optional)

If configured, it must match `YOUR_REGISTRY_URL`. See [GitHub Config](#GitHub-Config).


### Proxy Config

If you are behind a proxy server, the plugin needs to know the proxy server in order to make GitHub requests.

Configure the below environment variable.

```
$ export GLOBAL_AGENT_HTTP_PROXY=http://127.0.0.1:8080
```

See the [global-agent](https://github.com/gajus/global-agent#environment-variables) docs for detailed configuration instrcutions.

## Login

### Verdaccio UI

- Click the login button and get redirected to GitHub.
- Authorize the registry for your user and the configured GitHub org - this only needs to be done once.
- When completed, you'll be redirected back to the Verdaccio registry.

You are now logged in.

**Important**: Make sure to click the <kbd>Request</kbd> or <kbd>Grant</kbd> button for `read:org` access when prompted to authorize.
If you accidentally skipped this step, go to https://github.com/settings/applications, find the Verdaccio registry and grant `read:org` access from there.

### Command Line

#### Option A) Use the built-in CLI

The easiest way to configure npm is to use this short command:

```
$ npx verdaccio-auth0-ui --registry http://localhost:4873
```

#### Option B) Copy commands from the UI

- Verdaccio 5:

Open the "Register Info" dialog and klick "Copy to clipboard":

![](screenshots/register-info.png)


- Run the copied commands on your terminal:

```
$ npm config set //localhost:4873:_authToken "SECRET_TOKEN"
$ npm config set //localhost:4873:always-auth true
```

- Verify npm is set up correctly by running the `whoami` command. Example:

```
$ npm whoami --registry http://localhost:4873
n4bb12
```

If you see your GitHub username, you are ready to start installing and publishing packages.

## Logout

### Verdaccio UI

Click the <kbd>Logout</kbd> button as per usual.

### Command Line

Unless OAuth access is revoked in the GitHub settings, the token is valid indefinitely.

## Revoke Tokens

To invalidate your active login tokens you need to revoke access on the GitHub OAuth app:

- Go to https://github.com/settings/applications
- Find your Verdaccio app
- Click the <kbd>Revoke</kbd> button as shown below

![](screenshots/revoke.png)

If you have created the GitHub OAuth app, you can also revoke access for all users:

- Go to https://github.com/settings/applications
- Find your Verdaccio app
- Click the app name
- On the app detail page click the <kbd>Revoke all user tokens</kbd> button
