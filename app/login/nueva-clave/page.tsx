import type { Metadata } from "next";
import { getDict } from "@/lib/i18n-server";
import { NewPasswordForm } from "./NewPasswordForm";

export const metadata: Metadata = { title: "Nueva contraseña", robots: { index: false } };

// Password-reset emails land here (through /auth/callback, which signs the person in first).
export default async function NewPassword() {
  const { t } = await getDict();
  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <NewPasswordForm t={t} />
    </div>
  );
}
