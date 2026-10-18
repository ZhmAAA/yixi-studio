"use client";

import { useRouter } from "next/navigation";

export function StudioLogout() {
  const router = useRouter();
  return (
    <button
      className="button button-light"
      type="button"
      onClick={async () => {
        await fetch("/api/studio/session", { method: "DELETE" });
        router.push("/");
        router.refresh();
      }}
    >
      退出
    </button>
  );
}
