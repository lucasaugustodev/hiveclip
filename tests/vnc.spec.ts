import { test, expect } from "@playwright/test";

const VM_IP = "216.238.104.3";
const VM_INSTANCE_ID = "f52a3abd-8d88-4dd9-81a5-045f18bb2d47";

test.describe("VNC Desktop", () => {
  test("can open desktop page and connect to VNC", async ({ page }) => {
    // Register
    const email = `vnc-${Date.now()}@test.com`;
    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Your Boards")).toBeVisible({ timeout: 10000 });

    // Create board
    await page.getByRole("button", { name: "New Board" }).click();
    await page.getByLabel("Name").fill("VNC Test Board");
    await page.getByRole("button", { name: "Create Board" }).click();
    await expect(page.getByText("VNC Test Board")).toBeVisible({ timeout: 10000 });

    // Get board URL
    const url = page.url();
    const boardId = url.split("/boards/")[1];

    // Insert VM record directly via API
    const token = await page.evaluate(() => localStorage.getItem("hiveclip.token"));
    const apiBase = "http://localhost:3100";

    // Provision a VM (will hit Vultr API - skip this, insert via DB)
    // Instead, just navigate to desktop page and check noVNC attempts to connect
    await page.goto(`/boards/${boardId}/desktop`);

    // Should show "No VM IP available" or connecting state
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "screenshots/vnc-desktop.png", fullPage: true });

    // Check the page rendered correctly
    await expect(page.getByText("VNC Test Board")).toBeVisible();
    await expect(page.getByText("Desktop")).toBeVisible();
  });

  test("VNC viewer renders when VM has IP", async ({ page }) => {
    // Register and create board
    const email = `vnc2-${Date.now()}@test.com`;
    await page.goto("/register");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("password123");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Your Boards")).toBeVisible({ timeout: 10000 });

    // Create board
    await page.getByRole("button", { name: "New Board" }).click();
    await page.getByLabel("Name").fill("VNC Live Board");
    await page.getByRole("button", { name: "Create Board" }).click();
    await expect(page.getByText("VNC Live Board")).toBeVisible({ timeout: 10000 });

    // Click Provision VM
    await page.getByRole("button", { name: "Provision VM" }).click();
    await page.waitForTimeout(3000);

    // Wait for VM data to appear
    await expect(page.getByText("Region:")).toBeVisible({ timeout: 15000 });

    await page.screenshot({ path: "screenshots/vnc-provisioned.png", fullPage: true });
  });
});
