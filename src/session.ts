import { launchBrowser } from "./browser.ts";
import { env } from "./env.ts";
import { TOTP } from "totp-generator";
import { UnreachableError } from "./utils.ts";
import { rootLogger } from "./log.ts";
import * as v from "valibot";

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

export const courseSchema = v.object({
  weekday: v.string(),
  period: v.string(),
  name: v.string(),
  id: v.string(),
});
export const timetableTargetOptionSchema = v.object({
  name: v.string(),
  id: v.string(),
});
export const timetableSchema = v.object({
  availableYears: v.array(timetableTargetOptionSchema),
  availableSemesters: v.array(timetableTargetOptionSchema),
  currentYear: v.string(),
  currentSemester: v.string(),
  courses: v.array(courseSchema),
});
export type Course = v.InferOutput<typeof courseSchema>;
export type TimetableTargetOption = v.InferOutput<typeof timetableTargetOptionSchema>;
export type Timetable = v.InferOutput<typeof timetableSchema>;
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
        await page.fill("#username", env().UEC_ID);
        await page.fill("#password", env().UEC_PASSWORD);
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

  async getTimetable(target: { year: string; semester: string } | undefined = undefined): Promise<{
    availableYears: TimetableTargetOption[];
    availableSemesters: TimetableTargetOption[];
    currentYear: string;
    currentSemester: string;
    courses: Course[];
  }> {
    await this.login();

    sessionLogger.info`Fetching timetable...`;
    if (target) {
      await page.goto(
        `https://webclass.cdel.uec.ac.jp/webclass/index.php?year=${target.year}&semester=${target.semester}`,
      );
    } else {
      await page.goto("https://webclass.cdel.uec.ac.jp/webclass/");
    }

    const availableYears = await page
      .locator('select[name="year"] > option')
      .evaluateAll((options) =>
        options.map((option): TimetableTargetOption => ({
          name: option.textContent?.trim() ?? "",
          id: option.getAttribute("value") ?? "",
        })),
      );

    const availableSemesters = await page
      .locator('select[name="semester"] > option')
      .evaluateAll((options) =>
        options.map((option): TimetableTargetOption => ({
          name: option.textContent?.trim() ?? "",
          id: option.getAttribute("value") ?? "",
        })),
      );
    const currentYear = await page
      .locator('select[name="year"] > option[selected]')
      .getAttribute("value");
    const currentSemester = await page
      .locator('select[name="semester"] > option[selected]')
      .getAttribute("value");

    let courses: Course[] = [];
    if ((await page.locator("#schedule-table").count()) === 0) {
      sessionLogger.warning`No courses registered in the timetable.`;
    } else {
      sessionLogger.info`Parsing courses from the timetable...`;
      const weekdayRow = await page.locator("#schedule-table > thead > tr > th").allTextContents();
      if (weekdayRow.length === 0) {
        throw new Error("Failed to parse weekday row from the timetable.");
      }
      courses = await page
        .locator("#schedule-table > tbody > tr")
        .evaluateAll((rows, weekdayRow) => {
          return rows.flatMap((row) => {
            const cells = Array.from(row.querySelectorAll("td"));
            const period = cells[0].textContent?.trim() ?? "";
            const courses: Course[] = [];
            for (const [index, cell] of cells.entries()) {
              const link = cell.querySelector("a");
              if (link) {
                const id = link.getAttribute("href")?.match(/course.php\/([0-9]+)/)?.[1] ?? "";
                courses.push({
                  id,
                  weekday: weekdayRow[index],
                  period,
                  name: link.textContent?.trim() ?? "",
                });
              }
            }

            return courses;
          });
        }, weekdayRow);
    }

    return {
      availableYears,
      availableSemesters,
      currentYear: currentYear ?? "",
      currentSemester: currentSemester ?? "",
      courses: courses,
    };
  }

  async exit(): Promise<void> {
    await page.close();
    await context.close();
    await close();
  }
}

const session = new Session();
export default session;
