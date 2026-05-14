import { ReactNode } from "react";
import { Zap } from "lucide-react";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen items-center justify-center" style={{ background: "#09090b" }}>
      <div className="w-full max-w-sm px-4">
        <div className="mb-8 flex flex-col items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl" style={{ background: "#818cf8" }}>
            <Zap className="h-4.5 w-4.5 text-white" fill="white" />
          </div>
          <div className="text-center">
            <h1 className="text-[18px] font-semibold" style={{ color: "#e4e4e7" }}>RideShare Analytics</h1>
            <p className="text-[12px] mt-0.5" style={{ color: "#52525b" }}>Delivery network intelligence platform</p>
          </div>
        </div>
        {children}
      </div>
    </div>
  );
}
