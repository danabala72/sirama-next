"use client";

import { X } from "lucide-react";
import { useEffect, useState } from "react";

const name = "sirama-toast";

export function FlashToast() {
  const [message, setMessage] = useState("");
  const dismiss = () => {
    document.cookie = `${name}=; path=/; max-age=0; samesite=lax`;
    setMessage("");
  };

  useEffect(() => {
    const readFlash = () => {
      const value = document.cookie
        .split("; ")
        .find((item) => item.startsWith(`${name}=`))
        ?.split("=")
        .slice(1)
        .join("=");
      if (value) setMessage(decodeURIComponent(value));
    };
    readFlash();
    const reader = window.setInterval(readFlash, 250);
    return () => window.clearInterval(reader);
  }, []);

  useEffect(() => {
    if (!message) return;
    const timer = window.setTimeout(dismiss, 4500);
    return () => window.clearTimeout(timer);
  }, [message]);

  if (!message) return null;
  const error = message.startsWith("Error:");
  return (
    <div className={`fixed right-4 top-4 z-[60] flex max-w-sm items-start gap-3 rounded-lg border bg-white px-4 py-3 text-sm shadow-lg ${error ? "border-red-200 text-red-800" : "border-emerald-200 text-emerald-800"}`} role="status">
      <span>{message}</span>
      <button type="button" onClick={dismiss} className={error ? "text-red-700" : "text-emerald-700"} aria-label="Tutup notifikasi"><X size={18} /></button>
    </div>
  );
}
