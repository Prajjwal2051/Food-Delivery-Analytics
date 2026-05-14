"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { Loader2 } from "lucide-react";
import { api } from "@/lib/api";

const schema = z.object({
  username: z.string().min(3, "Min 3 characters"),
  password: z.string().min(6, "Min 6 characters"),
  role: z.enum(["admin", "viewer", "manager"]),
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

export default function RegisterPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<Form>({
    resolver: zodResolver(schema),
    defaultValues: { role: "viewer" },
  });

  const onSubmit = async (data: Form) => {
    setError(null);
    try {
      await api.post("/auth/register", data);
      setSuccess(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (e: any) {
      setError(e.response?.data?.message || "Failed to create account.");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
      <div className="rounded-lg p-5 flex flex-col gap-4" style={{ background: "#111113", border: "1px solid #1f1f23" }}>
        {error && (
          <p className="text-[12px] px-3 py-2 rounded-lg" style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)", color: "#f87171" }}>
            {error}
          </p>
        )}
        {success && (
          <p className="text-[12px] px-3 py-2 rounded-lg" style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)", color: "#86efac" }}>
            Account created! Redirecting…
          </p>
        )}

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wider" style={{ color: "#52525b" }}>Username</label>
          <input placeholder="johndoe" style={fieldStyle} {...register("username")}
            onFocus={e => (e.currentTarget.style.borderColor = "#818cf8")}
            onBlur={e => (e.currentTarget.style.borderColor = "#27272a")}
          />
          {errors.username && <p className="text-[11px]" style={{ color: "#f87171" }}>{errors.username.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wider" style={{ color: "#52525b" }}>Password</label>
          <input type="password" placeholder="••••••••" style={fieldStyle} {...register("password")}
            onFocus={e => (e.currentTarget.style.borderColor = "#818cf8")}
            onBlur={e => (e.currentTarget.style.borderColor = "#27272a")}
          />
          {errors.password && <p className="text-[11px]" style={{ color: "#f87171" }}>{errors.password.message}</p>}
        </div>

        <div className="flex flex-col gap-1.5">
          <label className="text-[11px] uppercase tracking-wider" style={{ color: "#52525b" }}>Role</label>
          <select style={{ ...fieldStyle, appearance: "none" }} {...register("role")}
            onFocus={e => (e.currentTarget.style.borderColor = "#818cf8")}
            onBlur={e => (e.currentTarget.style.borderColor = "#27272a")}
          >
            <option value="viewer" style={{ background: "#111113" }}>Viewer</option>
            <option value="manager" style={{ background: "#111113" }}>Manager</option>
            <option value="admin" style={{ background: "#111113" }}>Admin</option>
          </select>
          {errors.role && <p className="text-[11px]" style={{ color: "#f87171" }}>{errors.role.message}</p>}
        </div>
      </div>

      <button
        type="submit" disabled={isSubmitting || success}
        className="flex items-center justify-center gap-2 rounded-lg py-2.5 text-[13px] font-medium transition-opacity disabled:opacity-50"
        style={{ background: "#818cf8", color: "#fff" }}
      >
        {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
        Create Account
      </button>

      <p className="text-center text-[12px]" style={{ color: "#52525b" }}>
        Already have an account?{" "}
        <Link href="/login" style={{ color: "#818cf8" }}>Sign in</Link>
      </p>
    </form>
  );
}
