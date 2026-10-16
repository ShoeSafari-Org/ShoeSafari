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
const imageBytes = new Uint8Array([137, 80, 78, 71]);
const imageMetadata = { contentType: "image/png" };

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "demo-shoesafari",
    storage: { rules: readFileSync("storage.rules", "utf8") },
  });
}, 30_000);

afterEach(async () => testEnv.clearStorage());
afterAll(async () => testEnv.cleanup());

describe("Storage authorization", () => {
  it("allows public product image reads only", async () => {
    const adminStorage = testEnv.authenticatedContext("admin", { admin: true }).storage();
    await assertSucceeds(
      uploadBytes(ref(adminStorage, "products/catalog.png"), imageBytes, imageMetadata)
    );

    const guestStorage = testEnv.unauthenticatedContext().storage();
    await assertSucceeds(getBytes(ref(guestStorage, "products/catalog.png")));
    await assertFails(getBytes(ref(guestStorage, "private/catalog.png")));
    await assertFails(
      uploadBytes(ref(guestStorage, "products/guest.png"), imageBytes, imageMetadata)
    );
  });

  it("denies customer upload, replacement, and deletion while allowing admin lifecycle", async () => {
    const adminStorage = testEnv.authenticatedContext("admin", { admin: true }).storage();
    const adminImage = ref(adminStorage, "products/lifecycle.png");
    await assertSucceeds(uploadBytes(adminImage, imageBytes, imageMetadata));
    await assertSucceeds(uploadBytes(adminImage, new Uint8Array([2, 3, 4]), imageMetadata));

    const customerStorage = testEnv.authenticatedContext("customer").storage();
    const customerImage = ref(customerStorage, "products/lifecycle.png");
    await assertFails(
      uploadBytes(ref(customerStorage, "products/new.png"), imageBytes, imageMetadata)
    );
    await assertFails(uploadBytes(customerImage, new Uint8Array([4, 5]), imageMetadata));
    await assertFails(deleteObject(customerImage));
    await assertSucceeds(deleteObject(adminImage));
  });
});
