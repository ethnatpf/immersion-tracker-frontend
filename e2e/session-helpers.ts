import { expect, type Page } from "@playwright/test";
import type {
  ContentResponseDto,
  CreateContentDtoType,
  ImmersionSessionResponseDto,
  LanguageResponseDto,
  SessionProgressDto,
} from "@/lib/api/generated/models";

export async function chooseFirstLanguage(page: Page) {
  const language = page.getByRole("combobox", {
    name: "Language",
    exact: true,
  });
  await expect(language).toBeEnabled();
  if ((await language.textContent())?.includes("Choose a language")) {
    await language.click();
    await page.getByRole("option").first().click();
  }
}

export async function createImmersionSession(
  page: Page,
  title: string,
  type: CreateContentDtoType,
  createdAt = new Date().toISOString(),
  progress?: SessionProgressDto,
) {
  const languagesResponse = await page.request.get("/api/backend/language");
  expect(languagesResponse).toBeOK();
  const languages = (await languagesResponse.json()) as LanguageResponseDto[];
  const language = languages[0];
  expect(language, "A language is needed to seed an immersion session").toBeDefined();

  const contentResponse = await page.request.post("/api/backend/content", {
    data: { title, type, language: language.id },
  });
  expect(contentResponse).toBeOK();
  const content = (await contentResponse.json()) as ContentResponseDto;

  const sessionResponse = await page.request.post("/api/backend/immersion-session", {
    data: {
      content: content._id,
      duration: 720,
      created_at: createdAt,
      ...(progress ? { progress } : {}),
    },
  });
  expect(sessionResponse).toBeOK();
  const session = (await sessionResponse.json()) as ImmersionSessionResponseDto;
  return { contentId: content._id, sessionId: session._id, createdAt: session.created_at };
}

export async function createReadingSession(
  page: Page,
  title: string,
  createdAt?: string,
) {
  return createImmersionSession(page, title, "book", createdAt, {
    unit: "page",
    start: 1,
    end: 8,
  });
}

export async function createAudiovisualSession(page: Page, title: string) {
  return createImmersionSession(page, title, "anime");
}

export async function createAudioSession(page: Page, title: string) {
  return createImmersionSession(page, title, "podcast");
}
