// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { deleteObject, getBytes, ref, uploadBytes } from "firebase/storage";

let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-shoesafari",
    storage: { rules: readFileSync("storage.rules", "utf8") },
  });
}, 30_000);

afterEach(async () => testEnv.clearStorage());
afterAll(async () => testEnv.cleanup());

describe("product Storage rules", () => {
  it("allows public image reads and denies writes from customers", async () => {
    const adminStorage = testEnv.authenticatedContext("admin", { admin: true }).storage();
    const image = ref(adminStorage, "products/shoe.png");
    await assertSucceeds(
      uploadBytes(image, new Uint8Array([1, 2, 3]), { contentType: "image/png" })
    );

    const publicImage = ref(testEnv.unauthenticatedContext().storage(), "products/shoe.png");
    await assertSucceeds(getBytes(publicImage));
    await assertFails(
      uploadBytes(
        ref(testEnv.authenticatedContext("customer").storage(), "products/customer.png"),
        new Uint8Array([1]),
        { contentType: "image/png" }
      )
    );
  });

  it("rejects non-image uploads even from admins", async () => {
    const storage = testEnv.authenticatedContext("admin", { admin: true }).storage();
    await assertFails(
      uploadBytes(ref(storage, "products/not-an-image.txt"), new Uint8Array([1]), {
        contentType: "text/plain",
      })
    );
  });
});
