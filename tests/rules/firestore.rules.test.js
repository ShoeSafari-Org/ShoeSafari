// @vitest-environment node
import { afterAll, afterEach, beforeAll, describe, it } from "vitest";
import { readFileSync } from "node:fs";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import { doc, getDoc, setDoc, updateDoc } from "firebase/firestore";

const projectId = "demo-shoesafari";
let testEnv;

beforeAll(async () => {
  testEnv = await initializeTestEnvironment({
    projectId,
    firestore: { rules: readFileSync("firestore.rules", "utf8") },
  });
}, 30_000);

afterEach(async () => testEnv.clearFirestore());
afterAll(async () => testEnv.cleanup());

describe("Firestore admin claim rules", () => {
  it("allows public product reads but only admins to write products", async () => {
    const path = doc(testEnv.unauthenticatedContext().firestore(), "ShoeSafariProducts", "shoe-1");
    await assertSucceeds(getDoc(path));
    await assertFails(setDoc(path, { name: "Sneaker", price: 80 }));

    const customerPath = doc(
      testEnv.authenticatedContext("customer", { email: "customer@example.com" }).firestore(),
      "ShoeSafariProducts",
      "shoe-1"
    );
    await assertFails(setDoc(customerPath, { name: "Sneaker", price: 80 }));

    const adminPath = doc(
      testEnv.authenticatedContext("admin", { admin: true }).firestore(),
      "ShoeSafariProducts",
      "shoe-1"
    );
    await assertSucceeds(setDoc(adminPath, { name: "Sneaker", price: 80 }));
  });

  it("limits order reads and management to the owner and admin", async () => {
    const ownerPath = doc(
      testEnv.authenticatedContext("customer-1").firestore(),
      "ShoeSafariOrders",
      "order-1"
    );
    await assertSucceeds(setDoc(ownerPath, { userId: "customer-1", status: "Paid" }));
    await assertSucceeds(getDoc(ownerPath));
    await assertFails(
      getDoc(
        doc(testEnv.authenticatedContext("customer-2").firestore(), "ShoeSafariOrders", "order-1")
      )
    );
    await assertFails(updateDoc(ownerPath, { status: "Shipped" }));

    const adminPath = doc(
      testEnv.authenticatedContext("admin", { admin: true }).firestore(),
      "ShoeSafariOrders",
      "order-1"
    );
    await assertSucceeds(getDoc(adminPath));
    await assertSucceeds(updateDoc(adminPath, { status: "Shipped" }));
  });

  it("allows anonymous guest-order creation without exposing guest orders", async () => {
    const guestDb = testEnv.unauthenticatedContext().firestore();
    const guestOrder = doc(guestDb, "ShoeSafariOrders", "guest-order");
    await assertSucceeds(setDoc(guestOrder, { userId: null, status: "Paid" }));
    await assertFails(getDoc(guestOrder));

    const forgedOwnerOrder = doc(guestDb, "ShoeSafariOrders", "forged-order");
    await assertFails(setDoc(forgedOwnerOrder, { userId: "customer-1", status: "Paid" }));
  });

  it("denies access to collections without an explicit rule", async () => {
    const customerDb = testEnv.authenticatedContext("customer-1").firestore();
    await assertFails(getDoc(doc(customerDb, "PrivateData", "record-1")));
    await assertFails(setDoc(doc(customerDb, "PrivateData", "record-1"), { value: true }));
  });
});
