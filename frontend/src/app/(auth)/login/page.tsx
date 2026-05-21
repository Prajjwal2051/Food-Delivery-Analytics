"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { api } from "@/lib/api";

const schema = z.object({
  username: z.string().min(1, "Required"),
  password: z.string().min(1, "Required"),
});
type Form = z.infer<typeof schema>;

const fieldStyle = {
  background: "#111113",
  border: "1px solid #27272a",
  borderRadius: "8px",
  color: "#e4e4e7",
  fontSize: "13px",
  padding: "8px 12px",
  width: "100%",
  outline: "none",
};

export default function LoginPage() {
  const router = useRouter();
  const setAuth = useAuthStore(s => s.setAuth);
  const [error, setError] = useState<string | null>(null);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({ resolver: zodResolver(schema) });

  const onSubmit = async (data: Form) => {
    setError(null);
    try {
      const r = await api.post("/auth/login", data);
      setAuth(r.data.user, r.data.token);
      router.push("/");
    } catch (e: any) {
      setError(e.response?.data?.message || "Invalid credentials.");
    }
  };

  return (
    <form suppressHydrationWarning onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div suppressHydrationWarning className="rounded-lg p-5 flex flex-col gap-4" style={{ background: "#111113", border: "1px solid #1f1f23" }}>
        {error && (
          <p suppressHydrationWarning className="text-[12px] px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
            {error}
          </p>
        )}

        <div suppressHydrationWarning className="flex flex-col gap-1.5">
          <label suppressHydrationWarning className="text-[11px] uppercase tracking-wider" style={{ color: "#52525b" }}>Username</label>
          <input suppressHydrationWarning placeholder="admin" style={fieldStyle} {...register("username")}
            onFocus={e => (e.currentTarget.style.borderColor = "#818cf8")}
            onBlur={e => (e.currentTarget.style.borderColor = "#27272a")}
          />
          {errors.username && <p suppressHydrationWarning className="text-[11px]" style={{ color: "#f87171" }}>{errors.username.message}</p>}
        </div>

        <div suppressHydrationWarning className="flex flex-col gap-1.5">
          <label suppressHydrationWarning className="text-[11px] uppercase tracking-wider" style={{ color: "#52525b" }}>Password</label>
          <input suppressHydrationWarning type="password" placeholder="••••••••" style={fieldStyle} {...register("password")}
            onFocus={e => (e.currentTarget.style.borderColor = "#818cf8")}
            onBlur={e => (e.currentTarget.style.borderColor = "#27272a")}
          />
          {errors.password && <p suppressHydrationWarning className="text-[11px]" style={{ color: "#f87171" }}>{errors.password.message}</p>}
        </div>
      </div>

      <button suppressHydrationWarning
        type="submit" disabled={isSubmitting}
        className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-medium transition-opacity disabled:opacity-50"
        style={{ background: "#818cf8", color: "#fff" }}
      >
        {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Sign In
      </button>

      <p suppressHydrationWarning className="text-center text-[12px]" style={{ color: "#52525b" }}>
        No account?{" "}
        <Link href="/register" style={{ color: "#818cf8" }}>Create one</Link>
      </p>
    </form>
  );
}
