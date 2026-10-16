import React from "react";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import AddProductForm from "../../app/admin/AddProductForm";
import EditProductForm from "../../app/admin/EditProductForm";

const firebaseMocks = vi.hoisted(() => ({
  ref: vi.fn(() => ({})),
  uploadBytes: vi.fn(async () => ({ ref: {} })),
  getDownloadURL: vi.fn(async () => "https://example.test/product.png"),
  collection: vi.fn(() => ({})),
  addDoc: vi.fn(async () => ({})),
  doc: vi.fn(() => ({})),
  getDoc: vi.fn(async () => ({
    exists: () => true,
    data: () => ({ name: "Existing shoe", price: 25, img: "existing.png" }),
  })),
  updateDoc: vi.fn(async () => ({})),
}));

vi.mock("../../lib/firebaseConfig", () => ({ db: {}, storage: {} }));
vi.mock("firebase/storage", () => ({
  ref: firebaseMocks.ref,
  uploadBytes: firebaseMocks.uploadBytes,
  getDownloadURL: firebaseMocks.getDownloadURL,
}));
vi.mock("firebase/firestore", () => ({
  collection: firebaseMocks.collection,
  addDoc: firebaseMocks.addDoc,
  doc: firebaseMocks.doc,
  getDoc: firebaseMocks.getDoc,
  updateDoc: firebaseMocks.updateDoc,
}));
vi.mock("../../components/Toast", () => ({ default: () => null }));

function getFileInput() {
  return document.querySelector('input[type="file"]');
}

describe("admin product image uploads", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unsupported add-form files before upload and keeps entered values", async () => {
    const { container } = render(<AddProductForm onProductAdded={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Trail shoe" },
    });
    fireEvent.change(container.querySelector('input[type="number"]'), {
      target: { value: "49" },
    });
    fireEvent.change(getFileInput(), {
      target: { files: [new File(["bad"], "notes.txt", { type: "text/plain" })] },
    });

    fireEvent.submit(container.querySelector("form"));

    expect(await screen.findByRole("alert")).toHaveTextContent(/jpeg, png, webp, or gif/i);
    expect(screen.getByRole("textbox")).toHaveValue("Trail shoe");
    expect(container.querySelector('input[type="number"]')).toHaveValue(49);
    expect(firebaseMocks.uploadBytes).not.toHaveBeenCalled();
    expect(firebaseMocks.addDoc).not.toHaveBeenCalled();
  });

  it("uploads a supported add-form image", async () => {
    const onProductAdded = vi.fn();
    const { container } = render(<AddProductForm onProductAdded={onProductAdded} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Trail shoe" },
    });
    fireEvent.change(container.querySelector('input[type="number"]'), {
      target: { value: "49" },
    });
    fireEvent.change(getFileInput(), {
      target: { files: [new File(["image"], "shoe.png", { type: "image/png" })] },
    });

    fireEvent.submit(container.querySelector("form"));

    await waitFor(() => expect(firebaseMocks.uploadBytes).toHaveBeenCalledTimes(1));
    expect(firebaseMocks.addDoc).toHaveBeenCalledTimes(1);
    expect(onProductAdded).toHaveBeenCalledTimes(1);
  });

  it("rejects an invalid add-form price before upload or Firestore writes", async () => {
    const { container } = render(<AddProductForm onProductAdded={vi.fn()} />);
    fireEvent.change(screen.getByRole("textbox"), {
      target: { value: "Trail shoe" },
    });
    fireEvent.change(container.querySelector('input[type="number"]'), {
      target: { value: "not-a-price" },
    });
    fireEvent.change(getFileInput(), {
      target: { files: [new File(["image"], "shoe.png", { type: "image/png" })] },
    });

    fireEvent.submit(container.querySelector("form"));

    expect(await screen.findByRole("alert")).toHaveTextContent(/valid price/i);
    expect(firebaseMocks.uploadBytes).not.toHaveBeenCalled();
    expect(firebaseMocks.addDoc).not.toHaveBeenCalled();
  });

  it("rejects unsupported edit-form files before upload and keeps form values", async () => {
    const { container } = render(
      <EditProductForm productId="shoe-1" onProductUpdated={vi.fn()} />
    );
    await screen.findByDisplayValue("Existing shoe");
    fireEvent.change(getFileInput(), {
      target: { files: [new File(["bad"], "notes.txt", { type: "text/plain" })] },
    });

    fireEvent.submit(container.querySelector("form"));

    expect(await screen.findByRole("alert")).toHaveTextContent(/jpeg, png, webp, or gif/i);
    expect(screen.getByDisplayValue("Existing shoe")).toBeInTheDocument();
    expect(firebaseMocks.uploadBytes).not.toHaveBeenCalled();
    expect(firebaseMocks.updateDoc).not.toHaveBeenCalled();
  });

  it("rejects an invalid edit-form price before upload or Firestore writes", async () => {
    const { container } = render(
      <EditProductForm productId="shoe-1" onProductUpdated={vi.fn()} />
    );
    await screen.findByDisplayValue("Existing shoe");
    fireEvent.change(container.querySelector('input[type="number"]'), {
      target: { value: "-2" },
    });
    fireEvent.change(getFileInput(), {
      target: { files: [new File(["image"], "shoe.png", { type: "image/png" })] },
    });

    fireEvent.submit(container.querySelector("form"));

    expect(await screen.findByRole("alert")).toHaveTextContent(/greater than zero/i);
    expect(firebaseMocks.uploadBytes).not.toHaveBeenCalled();
    expect(firebaseMocks.updateDoc).not.toHaveBeenCalled();
  });
});
