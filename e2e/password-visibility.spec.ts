import { expect, test } from "@playwright/test";

test("password visibility toggles have screen-reader state and keyboard support", async ({
  page,
}) => {
  await page.goto("/profile/login");

  const password = page.getByLabel("Password", { exact: true });
  let toggle = page.getByRole("button", { name: "Show password" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(password).toHaveAttribute("type", "text");

  toggle = page.getByRole("button", { name: "Hide password" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(password).toHaveAttribute("type", "password");
  await expect(
    page.getByRole("button", { name: "Show password" })
  ).toHaveAttribute("aria-pressed", "false");

  await page.getByRole("button", { name: "Create an account" }).click();
  const confirmPassword = page.getByLabel("Confirm Password", { exact: true });
  toggle = page.getByRole("button", { name: "Show confirm password" });
  await expect(toggle).toHaveAttribute("aria-pressed", "false");
  await toggle.focus();
  await page.keyboard.press("Enter");
  await expect(confirmPassword).toHaveAttribute("type", "text");

  toggle = page.getByRole("button", { name: "Hide confirm password" });
  await expect(toggle).toHaveAttribute("aria-pressed", "true");
  await toggle.focus();
  await page.keyboard.press("Space");
  await expect(confirmPassword).toHaveAttribute("type", "password");
  await expect(
    page.getByRole("button", { name: "Show confirm password" })
  ).toHaveAttribute("aria-pressed", "false");
});
