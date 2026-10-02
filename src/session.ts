import { launchBrowser } from "./browser.ts";
import { env } from "./env.ts";
import { TOTP } from "totp-generator";
import { UnreachableError } from "./utils.ts";
import { rootLogger } from "./log.ts";

const sessionLogger = rootLogger.getChild("session");
const { browser, close } = await launchBrowser();
const context = await browser.newContext({
  locale: "ja-JP",
});
const page = await context.newPage();
page.on("load", () => {
  sessionLogger.info`Page loaded: ${page.url()}`;
});
const secret = new URL(env().UEC_TOTP_URL).searchParams.get("secret") as string;

class Session {
  constructor() {}
  async login(): Promise<void> {
    sessionLogger.info`Logging in to WebClass...`;

    const homeUrl = "https://webclass.cdel.uec.ac.jp/webclass/";
    const ssoIdPassUrl =
      "https://shibboleth.cc.uec.ac.jp/idp/profile/SAML2/Redirect/SSO?execution=e1s2";
    const ssoMfaUrl = "https://shibboleth.cc.uec.ac.jp/fl/saml/mfa/authentication";
    const wcLoginUrl = "https://webclass.cdel.uec.ac.jp/webclass/login.php";
    const actionUrls = [homeUrl, wcLoginUrl, ssoIdPassUrl, ssoMfaUrl];

    await page.goto(homeUrl);

    const visitedUrls = new Set<string>();

    while (true) {
      await page.waitForURL(
        (url) => actionUrls.some((actionUrl) => url.href.startsWith(actionUrl)),
        { timeout: 10000 },
      );
      if (visitedUrls.has(page.url())) {
        throw new Error("Loop detected in login flow");
      }
      visitedUrls.add(page.url());

      if (page.url().startsWith(wcLoginUrl)) {
        sessionLogger.info`Filling in username and password for WebClass...`;
        await page.fill('#username', env().UEC_ID);
        await page.fill('#password', env().UEC_PASSWORD);
        await page.click('input[type="submit"]');
      } else if (page.url().startsWith(homeUrl)) {
        sessionLogger.info`Login successful!`;
        break;
      } else if (page.url().startsWith(ssoIdPassUrl)) {
        sessionLogger.info`Filling in username and password for SSO...`;
        await page.fill('input[name="j_username"]', env().UEC_ID);
        await page.fill('input[name="j_password"]', env().UEC_PASSWORD);
        await page.click('button[name="_eventId_proceed"]');
      } else if (page.url().startsWith(ssoMfaUrl)) {
        sessionLogger.info`Filling in TOTP for SSO...`;
        await page.fill(
          'input[id="frm-authcode"]',
          await TOTP.generate(secret).then((otp) => otp.otp),
        );
        await page.click('input[type="submit"]');
      } else {
        throw new UnreachableError(`Unexpected URL: ${page.url()}`);
      }
    }
  }

  async whoami(): Promise<{ name: string; emails: string[] }> {
    await this.login();

    sessionLogger.info`Fetching user information...`;
    await page.goto("https://webclass.cdel.uec.ac.jp/webclass/user.php/config");
    const name = await page.locator("#UserIdTitle + div > p.form-control-static").textContent();
    const emails = await page
      .locator('input[name="email"]')
      .getAttribute("value")
      .then((c) => c?.split(",") ?? []);
    return { name: name ?? "", emails };
  }

  async exit(): Promise<void> {
    await page.close();
    await context.close();
    await close();
  }
}

const session = new Session();
export default session;
