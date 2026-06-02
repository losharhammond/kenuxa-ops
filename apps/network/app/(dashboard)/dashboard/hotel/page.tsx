"use client";

import { useState, useEffect, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import {
  BedDouble, Plus, Search, Calendar,
  X, Check, Star, Brain,
  Coffee, Wifi, Car, Tv, Bath, Wind, Phone,
} from "lucide-react";

// ─── Types ────────────────────────────────────────────────────────────────────
interface HotelRoom {
  id: string;
  business_id: string;
  room_number: string;
  room_type: string;
  floor: number;
  capacity: number;
  rate_per_night: number;
  status: string;
  amenities: string[];
  current_guest: string | null;
  checkout_date: string | null;
  created_at: string;
}

interface Reservation {
  id: string;
  business_id: string;
  room_id: string;
  room_number: string;
  guest_name: string;
  guest_email: string | null;
  guest_phone: string | null;
  check_in: string;
  check_out: string;
  adults: number;
  children: number;
  total_amount: number;
  paid_amount: number;
  status: string;
  special_requests: string | null;
  created_at: string;
}

type Tab = "rooms" | "reservations" | "housekeeping" | "analytics";

const ROOM_TYPES = ["Standard", "Deluxe", "Superior", "Suite", "Executive Suite", "Presidential Suite"];

const ROOM_STATUS: Record<string, { label: string; color: string; dot: string }> = {
  available:   { label: "Available",    color: "text-green-400 bg-green-400/10 border-green-400/20",  dot: "bg-green-400" },
  occupied:    { label: "Occupied",     color: "text-blue-400 bg-blue-400/10 border-blue-400/20",    dot: "bg-blue-400" },
  reserved:    { label: "Reserved",     color: "text-orange-400 bg-orange-400/10 border-orange-400/20", dot: "bg-orange-400" },
  cleaning:    { label: "Cleaning",     color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20", dot: "bg-yellow-400" },
  maintenance: { label: "Maintenance",  color: "text-red-400 bg-red-400/10 border-red-400/20",       dot: "bg-red-400" },
};

const RES_STATUS: Record<string, { label: string; color: string }> = {
  confirmed:  { label: "Confirmed",   color: "text-green-400 bg-green-400/10 border-green-400/20" },
  checked_in: { label: "Checked In",  color: "text-blue-400 bg-blue-400/10 border-blue-400/20" },
  checked_out:{ label: "Checked Out", color: "text-white/40 bg-white/5 border-white/10" },
  cancelled:  { label: "Cancelled",   color: "text-red-400 bg-red-400/10 border-red-400/20" },
  no_show:    { label: "No Show",     color: "text-yellow-400 bg-yellow-400/10 border-yellow-400/20" },
};

const AMENITY_ICONS: Record<string, React.ElementType> = {
  WiFi: Wifi, TV: Tv, AC: Wind, Parking: Car, Bath: Bath,
  "Coffee Maker": Coffee, Phone: Phone, Minibar: Star,
};


// ─── ReservationModal ──────────────────────────────────────────────────────────
function ReservationModal({
  rooms,
  onClose,
  onSave,
}: {
  rooms: HotelRoom[];
  onClose: () => void;
  onSave: (data: Partial<Reservation>) => void;
}) {
  const available = rooms.filter((r) => r.status === "available" || r.status === "reserved");
  const [form, setForm] = useState<Partial<Reservation>>({
    guest_name: "", guest_email: "", guest_phone: "",
    check_in: new Date().toISOString().split("T")[0]!,
    check_out: new Date(Date.now() + 86400000).toISOString().split("T")[0]!,
    adults: 1, children: 0, status: "confirmed", special_requests: "",
    room_id: available[0]?.id ?? "", room_number: available[0]?.room_number ?? "",
  });

  const set = (k: keyof Reservation, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const selectedRoom = rooms.find((r) => r.id === form.room_id);
  const nights = form.check_in && form.check_out
    ? Math.max(1, Math.ceil((new Date(form.check_out).getTime() - new Date(form.check_in).getTime()) / 86400000))
    : 1;
  const total = (selectedRoom?.rate_per_night ?? 0) * nights;

  const handleRoomChange = (roomId: string) => {
    const r = rooms.find((rm) => rm.id === roomId);
    set("room_id", roomId);
    if (r) set("room_number", r.room_number);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b border-white/8">
          <h2 className="text-white font-semibold">New Reservation</h2>
          <button onClick={onClose} className="text-white/40 hover:text-white/80"><X size={18} /></button>
        </div>
        <div className="p-5 space-y-4">
          <div>
            <label className="text-xs text-white/50 mb-1 block">Room</label>
            <select value={form.room_id} onChange={(e) => handleRoomChange(e.target.value)}
              className="w-full bg-[#0d0f1a] border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50">
              {available.map((r) => (
                <option key={r.id} value={r.id}>
                  Room {r.room_number} — {r.room_type} (GHS {r.rate_per_night}/night)
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Guest Name *</label>
            <input value={form.guest_name ?? ""} onChange={(e) => set("guest_name", e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-white/50 mb-1 block">Phone</label>
              <input value={form.guest_phone ?? ""} onChange={(e) => set("guest_phone", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Email</label>
              <input value={form.guest_email ?? ""} onChange={(e) => set("guest_email", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Check-In</label>
              <input type="date" value={form.check_in ?? ""} onChange={(e) => set("check_in", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Check-Out</label>
              <input type="date" value={form.check_out ?? ""} onChange={(e) => set("check_out", e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Adults</label>
              <input type="number" min={1} value={form.adults ?? 1} onChange={(e) => set("adults", +e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
            </div>
            <div>
              <label className="text-xs text-white/50 mb-1 block">Children</label>
              <input type="number" min={0} value={form.children ?? 0} onChange={(e) => set("children", +e.target.value)}
                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
            </div>
          </div>
          <div>
            <label className="text-xs text-white/50 mb-1 block">Special Requests</label>
            <textarea value={form.special_requests ?? ""} onChange={(e) => set("special_requests", e.target.value)} rows={2}
              className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50 resize-none" />
          </div>
          {/* Summary */}
          <div className="bg-white/5 rounded-xl p-3 text-sm">
            <div className="flex justify-between text-white/60"><span>{nights} night{nights > 1 ? "s" : ""} × GHS {selectedRoom?.rate_per_night ?? 0}</span><span>GHS {total.toFixed(2)}</span></div>
            <div className="flex justify-between text-white font-semibold mt-1 pt-1 border-t border-white/10"><span>Total</span><span>GHS {total.toFixed(2)}</span></div>
          </div>
        </div>
        <div className="flex gap-3 p-5 border-t border-white/8">
          <button onClick={onClose} className="flex-1 py-2 rounded-lg border border-white/10 text-white/60 hover:text-white text-sm">Cancel</button>
          <button onClick={() => onSave({ ...form, total_amount: total, paid_amount: 0 })}
            className="flex-1 py-2 rounded-lg bg-[#FF6524] text-white text-sm font-medium hover:bg-[#e55a1f]">
            Confirm Reservation
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function HotelPage() {
  const supabase = createClient();
  const { profile } = useAuth();

  const [tab, setTab] = useState<Tab>("rooms");
  const [rooms, setRooms] = useState<HotelRoom[]>([]);
  const [reservations, setReservations] = useState<Reservation[]>([]);
  const [loading, setLoading] = useState(true);
  const [showResModal, setShowResModal] = useState(false);
  const [searchRes, setSearchRes] = useState("");

  const businessId = profile?.business_id;

  const load = useCallback(async () => {
    if (!businessId) return;
    setLoading(true);
    try {
    const [roomRes, resRes] = await Promise.all([
      supabase.from("hotel_rooms").select("*").eq("business_id", businessId).order("room_number"),
      supabase.from("hotel_reservations").select("*").eq("business_id", businessId).order("check_in", { ascending: false }),
    ]);

    const roomData = (roomRes.data ?? []) as HotelRoom[];
    const resData  = (resRes.data  ?? []) as Reservation[];

    setRooms(roomData);
    setReservations(resData);
  } finally {
    setLoading(false);
  }
  }, [businessId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { load(); }, [load]);

  const handleSaveReservation = async (data: Partial<Reservation>) => {
    if (!businessId || !data.room_id || !data.guest_name) return;
    await supabase.from("hotel_reservations").insert({ ...data, business_id: businessId });
    // Mark room as reserved
    await supabase.from("hotel_rooms").update({ status: "reserved", current_guest: data.guest_name, checkout_date: data.check_out }).eq("id", data.room_id);
    setShowResModal(false);
    load();
  };

  const updateRoomStatus = async (id: string, status: string) => {
    const updates: Partial<HotelRoom> = { status };
    if (status === "available") { updates.current_guest = null; updates.checkout_date = null; }
    await supabase.from("hotel_rooms").update(updates).eq("id", id);
    load();
  };

  // Derived
  const available   = rooms.filter((r) => r.status === "available").length;
  const occupied    = rooms.filter((r) => r.status === "occupied").length;
  const cleaning    = rooms.filter((r) => r.status === "cleaning").length;
  const occupancyPct = rooms.length > 0 ? Math.round(((occupied + rooms.filter((r) => r.status === "reserved").length) / rooms.length) * 100) : 0;
  const todayRevenue = reservations
    .filter((r) => r.status === "checked_in" && new Date(r.check_in).toDateString() === new Date().toDateString())
    .reduce((s, r) => s + r.total_amount, 0);

  const filteredRes = reservations.filter((r) => {
    const q = searchRes.toLowerCase();
    return !q || r.guest_name.toLowerCase().includes(q) || r.room_number.includes(q);
  });

  const todayStr = new Date().toISOString().split("T")[0]!;
  const checkouts = rooms.filter((r) => r.status === "occupied" && r.checkout_date === todayStr);
  const roomsByFloor = Array.from(new Set(rooms.map((r) => r.floor))).sort();

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin w-8 h-8 border-2 border-[#FF6524] border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <BedDouble className="text-[#FF6524]" size={24} />
            Hotel OS
          </h1>
          <p className="text-white/40 text-sm mt-0.5">Room management, reservations & guest services</p>
        </div>
        <button onClick={() => setShowResModal(true)}
          className="flex items-center gap-2 bg-[#FF6524] text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-[#e55a1f]">
          <Plus size={16} /> New Reservation
        </button>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Occupancy",     value: `${occupancyPct}%`,    sub: `${occupied}/${rooms.length} rooms`,  color: "text-blue-400" },
          { label: "Available",     value: available,              sub: "rooms ready",                        color: "text-green-400" },
          { label: "Checkout Today",value: checkouts.length,       sub: "pending",                            color: "text-yellow-400" },
          { label: "Today Revenue", value: `GHS ${todayRevenue.toLocaleString()}`, sub: "check-ins today",   color: "text-[#FF6524]" },
        ].map((kpi) => (
          <div key={kpi.label} className="bg-white/3 border border-white/8 rounded-xl p-4">
            <p className="text-xs text-white/40 mb-1">{kpi.label}</p>
            <p className={`text-2xl font-bold ${kpi.color}`}>{kpi.value}</p>
            <p className="text-xs text-white/30 mt-0.5">{kpi.sub}</p>
          </div>
        ))}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-white/3 border border-white/8 rounded-xl p-1 w-fit">
        {(["rooms", "reservations", "housekeeping", "analytics"] as Tab[]).map((t) => (
          <button key={t} onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-lg text-sm font-medium capitalize transition-all ${
              tab === t ? "bg-[#FF6524] text-white" : "text-white/50 hover:text-white"
            }`}>
            {t === "housekeeping" ? "Housekeeping" : t.charAt(0).toUpperCase() + t.slice(1)}
          </button>
        ))}
      </div>

      {/* ── ROOMS ────────────────────────────────────────────────────────────────── */}
      {tab === "rooms" && (
        <div className="space-y-6">
          {/* Legend */}
          <div className="flex items-center gap-4 flex-wrap">
            {Object.entries(ROOM_STATUS).map(([k, v]) => (
              <div key={k} className="flex items-center gap-1.5">
                <div className={`w-2 h-2 rounded-full ${v.dot}`} />
                <span className="text-xs text-white/40">{v.label}</span>
              </div>
            ))}
          </div>

          {/* Floor grid */}
          {roomsByFloor.map((floor) => {
            const floorRooms = rooms.filter((r) => r.floor === floor);
            return (
              <div key={floor}>
                <h3 className="text-xs font-semibold text-white/40 uppercase tracking-widest mb-3">Floor {floor}</h3>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {floorRooms.map((room) => {
                    const s = ROOM_STATUS[room.status] ?? ROOM_STATUS["available"]!;
                    return (
                      <div key={room.id} className="bg-white/3 border border-white/8 rounded-xl p-4 hover:border-white/15 transition-all">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-white font-bold text-lg">#{room.room_number}</span>
                          <span className={`text-[10px] border px-1.5 py-0.5 rounded-full ${s.color}`}>{s.label}</span>
                        </div>
                        <p className="text-xs text-white/50 mb-1">{room.room_type}</p>
                        <p className="text-sm text-white font-medium">GHS {room.rate_per_night}/night</p>
                        <div className="flex flex-wrap gap-1 mt-2">
                          {room.amenities.slice(0, 4).map((a) => {
                            const Icon = AMENITY_ICONS[a] ?? Star;
                            return <Icon key={a} size={12} className="text-white/30" />;
                          })}
                          {room.amenities.length > 4 && <span className="text-[10px] text-white/20">+{room.amenities.length - 4}</span>}
                        </div>
                        {room.current_guest && (
                          <p className="text-xs text-blue-400 mt-2 truncate">{room.current_guest}</p>
                        )}
                        {room.checkout_date && (
                          <p className="text-[10px] text-white/30 mt-0.5">Out: {room.checkout_date}</p>
                        )}
                        {/* Status actions */}
                        <div className="mt-3 flex gap-1">
                          {room.status === "occupied" && (
                            <button onClick={() => updateRoomStatus(room.id, "cleaning")}
                              className="flex-1 text-[10px] py-1 rounded-md bg-yellow-400/10 text-yellow-400 hover:bg-yellow-400/20">Checkout</button>
                          )}
                          {room.status === "cleaning" && (
                            <button onClick={() => updateRoomStatus(room.id, "available")}
                              className="flex-1 text-[10px] py-1 rounded-md bg-green-400/10 text-green-400 hover:bg-green-400/20">Mark Clean</button>
                          )}
                          {room.status === "reserved" && (
                            <button onClick={() => updateRoomStatus(room.id, "occupied")}
                              className="flex-1 text-[10px] py-1 rounded-md bg-blue-400/10 text-blue-400 hover:bg-blue-400/20">Check In</button>
                          )}
                          {room.status === "maintenance" && (
                            <button onClick={() => updateRoomStatus(room.id, "available")}
                              className="flex-1 text-[10px] py-1 rounded-md bg-green-400/10 text-green-400 hover:bg-green-400/20">Resolved</button>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── RESERVATIONS ─────────────────────────────────────────────────────────── */}
      {tab === "reservations" && (
        <div className="space-y-4">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
            <input placeholder="Search guests or room..." value={searchRes} onChange={(e) => setSearchRes(e.target.value)}
              className="w-full bg-white/5 border border-white/10 rounded-lg pl-9 pr-3 py-2 text-white text-sm focus:outline-none focus:border-[#FF6524]/50" />
          </div>

          {filteredRes.length === 0 ? (
            <div className="text-center py-16 text-white/30 border border-white/8 rounded-xl">
              <Calendar size={40} className="mx-auto mb-3 opacity-20" />
              <p>No reservations yet</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredRes.map((r) => {
                const cfg = RES_STATUS[r.status] ?? RES_STATUS["confirmed"]!;
                const nights = Math.ceil((new Date(r.check_out).getTime() - new Date(r.check_in).getTime()) / 86400000);
                return (
                  <div key={r.id} className="bg-white/3 border border-white/8 rounded-xl p-4">
                    <div className="flex items-start justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <p className="text-white font-medium text-sm">{r.guest_name}</p>
                          <span className="text-xs text-white/40">Room {r.room_number}</span>
                        </div>
                        <p className="text-xs text-white/40 mt-0.5">{r.guest_phone} · {r.adults}A {r.children}C</p>
                      </div>
                      <span className={`text-xs border px-2 py-0.5 rounded-full ${cfg.color}`}>{cfg.label}</span>
                    </div>
                    <div className="flex items-center gap-4 mt-3 text-xs text-white/50">
                      <span>📅 {r.check_in} → {r.check_out}</span>
                      <span>{nights} night{nights > 1 ? "s" : ""}</span>
                      <span className="ml-auto text-white font-medium">GHS {r.total_amount.toFixed(2)}</span>
                    </div>
                    {r.special_requests && (
                      <p className="text-xs text-white/30 mt-2 italic">"{r.special_requests}"</p>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── HOUSEKEEPING ──────────────────────────────────────────────────────────── */}
      {tab === "housekeeping" && (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-4 mb-2">
            {[
              { label: "Needs Cleaning", rooms: rooms.filter((r) => r.status === "cleaning"), color: "text-yellow-400" },
              { label: "Today Checkouts", rooms: checkouts, color: "text-orange-400" },
              { label: "Maintenance", rooms: rooms.filter((r) => r.status === "maintenance"), color: "text-red-400" },
            ].map((group) => (
              <div key={group.label} className="bg-white/3 border border-white/8 rounded-xl p-4 text-center">
                <p className={`text-3xl font-bold ${group.color}`}>{group.rooms.length}</p>
                <p className="text-xs text-white/40 mt-1">{group.label}</p>
              </div>
            ))}
          </div>

          {/* Cleaning queue */}
          <h3 className="text-sm font-semibold text-white/60">Cleaning Queue</h3>
          {rooms.filter((r) => r.status === "cleaning").length === 0 ? (
            <div className="text-center py-8 text-white/30 border border-white/8 rounded-xl">
              <Check size={32} className="mx-auto mb-2 opacity-20" />
              <p>All rooms are clean</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rooms.filter((r) => r.status === "cleaning").map((room) => (
                <div key={room.id} className="flex items-center justify-between bg-white/3 border border-white/8 rounded-xl px-4 py-3">
                  <div>
                    <p className="text-white font-medium text-sm">Room {room.room_number}</p>
                    <p className="text-xs text-white/40">{room.room_type} · Floor {room.floor}</p>
                  </div>
                  <button onClick={() => updateRoomStatus(room.id, "available")}
                    className="flex items-center gap-1.5 bg-green-400/10 text-green-400 px-3 py-1.5 rounded-lg text-xs hover:bg-green-400/20">
                    <Check size={12} /> Mark Clean
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── ANALYTICS ──────────────────────────────────────────────────────────────── */}
      {tab === "analytics" && (
        <div className="space-y-6">
          <div className="bg-gradient-to-br from-[#FF6524]/10 to-purple-500/10 border border-[#FF6524]/20 rounded-xl p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain size={18} className="text-[#FF6524]" />
              <h3 className="text-white font-semibold text-sm">AI Hotel Intelligence</h3>
              <span className="text-[10px] bg-[#FF6524]/20 text-[#FF8B5E] px-2 py-0.5 rounded-full ml-auto">KENUXA AI</span>
            </div>
            <div className="space-y-2 text-sm text-white/70">
              <p className="bg-white/3 rounded-lg px-3 py-2">📊 Current occupancy is {occupancyPct}%. Industry average for your area is 68%. {occupancyPct < 68 ? "Consider promotional pricing to boost bookings." : "Excellent performance!"}</p>
              <p className="bg-white/3 rounded-lg px-3 py-2">🏆 Suite rooms generate {rooms.filter((r) => r.room_type.includes("Suite")).length > 0 ? "highest" : "significant"} revenue per room. Prioritize their availability.</p>
              <p className="bg-white/3 rounded-lg px-3 py-2">🧹 {cleaning} room{cleaning !== 1 ? "s" : ""} in cleaning queue. Target under 2-hour turnaround for same-day re-letting.</p>
              <p className="bg-white/3 rounded-lg px-3 py-2">📅 {checkouts.length} guest{checkouts.length !== 1 ? "s" : ""} checking out today. Prepare welcome kits for incoming reservations.</p>
            </div>
          </div>

          <div className="bg-white/3 border border-white/8 rounded-xl p-5">
            <h3 className="text-sm font-semibold text-white mb-4">Room Type Distribution</h3>
            <div className="space-y-3">
              {ROOM_TYPES.filter((t) => rooms.some((r) => r.room_type === t)).map((type) => {
                const typeRooms = rooms.filter((r) => r.room_type === type);
                const occ = typeRooms.filter((r) => r.status === "occupied" || r.status === "reserved").length;
                const pct = typeRooms.length > 0 ? Math.round((occ / typeRooms.length) * 100) : 0;
                const avgRate = typeRooms.reduce((s, r) => s + r.rate_per_night, 0) / typeRooms.length;
                return (
                  <div key={type} className="flex items-center gap-3">
                    <span className="text-xs text-white/50 w-32">{type}</span>
                    <div className="flex-1 bg-white/5 rounded-full h-1.5">
                      <div className="h-1.5 rounded-full bg-[#FF6524]" style={{ width: `${pct}%` }} />
                    </div>
                    <span className="text-xs text-white/40 w-12 text-right">{pct}%</span>
                    <span className="text-xs text-white/40 w-20 text-right">GHS {avgRate.toFixed(0)}/n</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {showResModal && (
        <ReservationModal rooms={rooms} onClose={() => setShowResModal(false)} onSave={handleSaveReservation} />
      )}
    </div>
  );
}
