"use client";

import { useState } from "react";

export function CopyLinkButton() {
  const [label, setLabel] = useState("复制链接");

  return (
    <button
      className="button button-light"
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(window.location.href);
          setLabel("已复制");
        } catch {
          setLabel("请从地址栏复制");
        }
      }}
    >
      {label}
    </button>
  );
}
