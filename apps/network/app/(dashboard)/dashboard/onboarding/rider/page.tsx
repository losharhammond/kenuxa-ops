"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoles } from "@/lib/hooks/use-roles";
import {
  Truck, CheckCircle, ArrowRight, ArrowLeft, Loader2,
  Bike, Car, Zap, Package,
} from "lucide-react";

const STEPS = ["Vehicle Details", "Verification", "Done"];

const VEHICLE_TYPES = [
  { value: "motorcycle", label: "Motorcycle", icon: Bike },
  { value: "bicycle",    label: "Bicycle",    icon: Bike },
  { value: "car",        label: "Car / Van",  icon: Car  },
  { value: "truck",      label: "Truck",      icon: Truck },
];

const DELIVERY_ZONES = [
  "Accra Central", "East Legon", "Tema", "Airport Area", "Adabraka",
  "Osu", "Labone", "Spintex", "Madina", "Kumasi", "Nationwide",
];

export default function RiderOnboardingPage() {
  const router = useRouter();
  const supabase = createClient();
  const { user } = useAuth();
  const { activateRole } = useRoles();

  const [step, setStep]       = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError]     = useState("");

  const [vehicleType, setVehicleType]     = useState("");
  const [vehicleModel, setVehicleModel]   = useState("");
  const [plateNumber, setPlateNumber]     = useState("");
  const [zones, setZones]                 = useState<string[]>([]);
  const [licenseNumber, setLicenseNumber] = useState("");
  const [agreeTerms, setAgreeTerms]       = useState(false);

  const toggleZone = (z: string) => setZones((p) => p.includes(z) ? p.filter((x) => x !== z) : [...p, z]);

  const handleSave = async () => {
    if (!agreeTerms) { setError("Please accept the terms to continue."); return; }
    setLoading(true);
    setError("");
    try {
      await supabase.from("delivery_riders").upsert({
        user_id: user!.id,
        vehicle_type: vehicleType,
        vehicle_model: vehicleModel || null,
        plate_number: plateNumber || null,
        license_number: licenseNumber || null,
        service_zones: zones,
        status: "active",
      }, { onConflict: "user_id" });

      await activateRole("delivery_rider", { vehicle_type: vehicleType });
      setStep(2);
    } catch (e: unknown) {
      setError((e as Error)?.message ?? "Failed to create rider profile");
    } finally {
      setLoading(false);
    }
  };

  const inputCls = "w-full bg-[#0d0f1a] border border-white/10 rounded-xl px-3.5 h-11 text-sm text-[#f1f5f9] outline-none focus:border-[#84cc16] transition-colors placeholder-[#374151]";

  return (
    <div className="min-h-screen bg-[#080a14] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-8">
          {STEPS.map((s, i) => (
            <div key={s} className="flex items-center gap-2 flex-1">
              <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                i < step ? "bg-[#84cc16] text-white" :
                i === step ? "bg-[rgba(132,204,22,0.2)] border-2 border-[#84cc16] text-[#84cc16]" :
                "bg-[#111624] border border-white/10 text-[#374151]"
              }`}>
                {i < step ? <CheckCircle size={13} /> : i + 1}
              </div>
              <span className={`text-xs hidden sm:block ${i === step ? "text-[#f1f5f9] font-medium" : "text-[#374151]"}`}>{s}</span>
              {i < STEPS.length - 1 && <div className={`h-px flex-1 ml-2 ${i < step ? "bg-[#84cc16]" : "bg-white/7"}`} />}
            </div>
          ))}
        </div>

        <div className="bg-[#111624] border border-white/7 rounded-2xl p-6 shadow-2xl">
          {step === 0 && (
            <div className="space-y-4">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-10 h-10 rounded-xl bg-[rgba(132,204,22,0.15)] flex items-center justify-center">
                  <Truck size={18} className="text-[#84cc16]" />
                </div>
                <div>
                  <h2 className="text-lg font-bold text-[#f1f5f9]">Vehicle Details</h2>
                  <p className="text-xs text-[#64748b]">Tell us about your delivery vehicle</p>
                </div>
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-2 block">Vehicle Type *</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {VEHICLE_TYPES.map(({ value, label, icon: Icon }) => (
                    <button key={value} type="button" onClick={() => setVehicleType(value)}
                      className={`flex flex-col items-center gap-2 p-3 rounded-xl border transition-all ${
                        vehicleType === value ? "border-[#84cc16] bg-[rgba(132,204,22,0.1)] text-[#84cc16]" : "border-white/7 text-[#64748b] hover:border-white/20"
                      }`}>
                      <Icon size={20} />
                      <span className="text-xs font-medium">{label}</span>
                    </button>
                  ))}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs text-[#64748b] mb-1.5 block">Vehicle Model</label>
                  <input className={inputCls} placeholder="e.g. Honda CB125" value={vehicleModel} onChange={(e) => setVehicleModel(e.target.value)} />
                </div>
                <div>
                  <label className="text-xs text-[#64748b] mb-1.5 block">Plate Number</label>
                  <input className={inputCls} placeholder="e.g. GR 1234-22" value={plateNumber} onChange={(e) => setPlateNumber(e.target.value)} />
                </div>
              </div>
              <div>
                <label className="text-xs text-[#64748b] mb-2 block">Delivery Zones</label>
                <div className="flex flex-wrap gap-2">
                  {DELIVERY_ZONES.map((z) => (
                    <button key={z} type="button" onClick={() => toggleZone(z)}
                      className={`px-2.5 py-1.5 rounded-lg border text-xs font-medium transition-all ${
                        zones.includes(z) ? "border-[#84cc16] bg-[rgba(132,204,22,0.1)] text-[#84cc16]" : "border-white/7 text-[#64748b] hover:border-white/20"
                      }`}>
                      {z}
                    </button>
                  ))}
                </div>
              </div>
              <button onClick={() => vehicleType && setStep(1)} disabled={!vehicleType}
                className="w-full h-11 bg-[#84cc16] rounded-xl text-[#0d0f1a] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#65a30d] disabled:opacity-40 transition-colors">
                Continue <ArrowRight size={15} />
              </button>
            </div>
          )}

          {step === 1 && (
            <div className="space-y-4">
              <h2 className="text-lg font-bold text-[#f1f5f9] mb-1">Verification</h2>
              <p className="text-xs text-[#64748b]">A valid driver&apos;s license is required to receive deliveries.</p>
              {error && <p className="text-xs text-[#f87171] bg-[rgba(239,68,68,0.1)] border border-[rgba(239,68,68,0.2)] rounded-lg px-3 py-2">{error}</p>}
              <div>
                <label className="text-xs text-[#64748b] mb-1.5 block">Driver&apos;s License Number</label>
                <input className={inputCls} placeholder="e.g. GHA-DL-12345678" value={licenseNumber} onChange={(e) => setLicenseNumber(e.target.value)} />
              </div>
              <div className="border-2 border-dashed border-white/10 rounded-xl p-5 text-center hover:border-[rgba(132,204,22,0.3)] transition-colors">
                <Package size={24} className="text-[#374151] mx-auto mb-2" />
                <p className="text-sm text-[#64748b]">Upload License / ID Document</p>
                <p className="text-xs text-[#374151] mt-1">Available after initial setup</p>
              </div>
              <div className="p-4 rounded-xl border border-[rgba(132,204,22,0.15)] bg-[rgba(132,204,22,0.04)]">
                <div className="flex items-start gap-2.5">
                  <Zap size={14} className="text-[#84cc16] mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-xs font-semibold text-[#84cc16] mb-1">Earning Potential</p>
                    <p className="text-xs text-[#64748b]">Riders earn per delivery + tips. Top riders earn GHS 2,000+ per month working flexible hours.</p>
                  </div>
                </div>
              </div>
              <label className="flex items-start gap-2.5 cursor-pointer">
                <input type="checkbox" checked={agreeTerms} onChange={(e) => setAgreeTerms(e.target.checked)} className="mt-0.5 accent-[#84cc16]" />
                <span className="text-xs text-[#64748b]">I agree to the KENUXA Delivery Partner terms and confirm my vehicle and documents are valid.</span>
              </label>
              <div className="flex gap-3">
                <button onClick={() => setStep(0)} className="flex-1 h-11 border border-white/10 rounded-xl text-[#64748b] text-sm flex items-center justify-center gap-2 hover:border-white/20 transition-all">
                  <ArrowLeft size={15} /> Back
                </button>
                <button onClick={handleSave} disabled={loading}
                  className="flex-1 h-11 bg-[#84cc16] rounded-xl text-[#0d0f1a] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#65a30d] disabled:opacity-60 transition-all">
                  {loading ? <><Loader2 size={15} className="animate-spin" /> Saving...</> : <><span>Activate Rider Role</span><ArrowRight size={15} /></>}
                </button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="text-center space-y-4 py-4">
              <div className="w-16 h-16 rounded-2xl bg-[#84cc16] flex items-center justify-center mx-auto">
                <CheckCircle size={32} className="text-[#0d0f1a]" />
              </div>
              <h2 className="text-xl font-bold text-[#f1f5f9]">Rider Account Active!</h2>
              <p className="text-sm text-[#64748b]">You can now accept deliveries and start earning.</p>
              <div className="flex gap-3 pt-2">
                <button onClick={() => router.push("/dashboard/delivery")} className="flex-1 h-11 bg-[#84cc16] rounded-xl text-[#0d0f1a] font-semibold text-sm flex items-center justify-center gap-2 hover:bg-[#65a30d] transition-colors">
                  Start Delivering <ArrowRight size={15} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
