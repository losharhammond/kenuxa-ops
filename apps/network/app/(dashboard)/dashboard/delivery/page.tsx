"use client";

import { useEffect, useState } from "react";
import { Header } from "@/components/layout/header";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { StatCard } from "@/components/ui/stat-card";
import { formatCurrency } from "@/lib/utils";
import { Truck, MapPin, CheckCircle2, Clock, UserCheck, Star, PlusCircle, Bike } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { useAuth } from "@/lib/hooks/use-auth";
import { useRoleGuard } from "@/lib/hooks/use-role-guard";

interface Delivery {
  id: string;
  delivery_ref: string;
  recipient_name: string;
  delivery_address: string;
  rider_name: string | null;
  fee: number;
  distance_km: number | null;
  status: string;
  eta_minutes: number | null;
  created_at: string;
}

interface Rider {
  id: string;
  full_name: string;
  zone: string | null;
  trips_today: number;
  rating: number;
  is_available: boolean;
}

interface DeliveryStats {
  today: number;
  in_transit: number;
  completed: number;
  revenue: number;
}

const STATUS_COLOR: Record<string, "green" | "blue" | "amber" | "orange" | "default"> = {
  delivered: "green", in_transit: "blue", picked_up: "blue",
  assigned: "orange", pending: "amber", failed: "default",
};

const STATUS_ICON: Record<string, React.ReactNode> = {
  delivered:  <CheckCircle2 size={14} className="text-[#34d399]" />,
  in_transit: <Bike size={14} className="text-[#3B82F6]" />,
  picked_up:  <Truck size={14} className="text-[#3B82F6]" />,
  assigned:   <UserCheck size={14} className="text-[#FF8B5E]" />,
  pending:    <Clock size={14} className="text-[#F59E0B]" />,
};

export default function DeliveryPage() {
  useRoleGuard("delivery.pickup");
  const { profile } = useAuth();
  const supabase = createClient();
  const [deliveries, setDeliveries] = useState<Delivery[]>([]);
  const [riders, setRiders] = useState<Rider[]>([]);
  const [stats, setStats] = useState<DeliveryStats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.business_id) return;
    async function load() {
      setLoading(true);
      try {
        const today = new Date().toISOString().slice(0, 10);

        const [{ data: delData }, { data: riderData }, { data: statsData }] = await Promise.all([
          supabase
            .from("delivery_orders")
            .select("id, delivery_ref, recipient_name, delivery_address, rider_name, fee, distance_km, status, eta_minutes, created_at")
            .eq("business_id", profile!.business_id)
            .gte("created_at", `${today}T00:00:00Z`)
            .order("created_at", { ascending: false })
            .limit(20),
          supabase
            .from("delivery_riders")
            .select("id, full_name, zone, trips_today, rating, is_available")
            .order("is_available", { ascending: false })
            .limit(10),
          supabase
            .from("delivery_orders")
            .select("status, fee")
            .eq("business_id", profile!.business_id)
            .gte("created_at", `${today}T00:00:00Z`),
        ]);

        setDeliveries((delData as Delivery[]) ?? []);
        setRiders((riderData as Rider[]) ?? []);

        if (statsData) {
          const all = statsData as { status: string; fee: number }[];
          setStats({
            today: all.length,
            in_transit: all.filter((d) => d.status === "in_transit" || d.status === "picked_up").length,
            completed:  all.filter((d) => d.status === "delivered").length,
            revenue:    all.reduce((s, d) => s + (d.fee ?? 0), 0),
          });
        }
      } finally {
        setLoading(false);
      }
    }
    load();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile?.business_id]);

  return (
    <div className="animate-fade-in">
      <Header
        title="Delivery Network"
        subtitle="Track orders and manage riders"
        actions={
          <Button size="sm">
            <PlusCircle size={13} />
            New Delivery
          </Button>
        }
      />

      <div className="p-6 space-y-6">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard title="Today's Deliveries" value={stats?.today ?? 0}     format="number" color="orange" icon={<Truck size={16} />} />
          <StatCard title="In Transit"          value={stats?.in_transit ?? 0} format="number" color="blue"   icon={<Bike size={16} />} />
          <StatCard title="Completed"           value={stats?.completed ?? 0}  format="number" color="green"  icon={<CheckCircle2 size={16} />} />
          <StatCard title="Delivery Revenue"    value={stats?.revenue ?? 0}    format="currency" color="amber" icon={<Truck size={16} />} />
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <div className="lg:col-span-2 space-y-4">
            <h3 className="text-sm font-semibold text-[#64748b] uppercase tracking-wider">Live Deliveries</h3>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-4">
                  <div className="h-14 bg-white/5 rounded animate-pulse" />
                </Card>
              ))
            ) : deliveries.length === 0 ? (
              <Card className="p-16 text-center">
                <Truck size={32} className="mx-auto text-[#374151] mb-3" />
                <p className="text-sm text-[#64748b]">No deliveries today</p>
                <p className="text-xs text-[#374151] mt-1">Create a new delivery to get started</p>
              </Card>
            ) : (
              deliveries.map((d) => (
                <Card key={d.id} className="p-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-lg bg-[rgba(255,101,36,0.08)] flex items-center justify-center flex-shrink-0">
                        {STATUS_ICON[d.status] ?? <Truck size={14} className="text-[#FF8B5E]" />}
                      </div>
                      <div>
                        <div className="flex items-center gap-2 mb-0.5">
                          <p className="text-sm font-semibold text-[#f1f5f9]">{d.delivery_ref}</p>
                          <Badge variant={STATUS_COLOR[d.status] ?? "default"} className="capitalize">
                            {d.status.replace("_", " ")}
                          </Badge>
                        </div>
                        <div className="flex items-center gap-1 text-sm text-[#64748b]">
                          <MapPin size={11} />
                          {d.delivery_address}
                        </div>
                        <p className="text-xs text-[#64748b] mt-0.5">
                          To: {d.recipient_name}
                          {d.distance_km && ` · ${d.distance_km}km`}
                          {" · "}{formatCurrency(d.fee)}
                          {d.rider_name && ` · ${d.rider_name}`}
                          {d.eta_minutes && (
                            <span className="text-[#FF8B5E]"> · ETA: {d.eta_minutes} min</span>
                          )}
                        </p>
                      </div>
                    </div>
                    <div className="flex gap-2 flex-shrink-0">
                      {d.status === "pending" && <Button size="sm">Assign Rider</Button>}
                    </div>
                  </div>
                </Card>
              ))
            )}
          </div>

          <div>
            <h3 className="text-sm font-semibold text-[#64748b] uppercase tracking-wider mb-4">Riders</h3>
            {loading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <Card key={i} className="p-4 mb-3">
                  <div className="h-12 bg-white/5 rounded animate-pulse" />
                </Card>
              ))
            ) : riders.length === 0 ? (
              <Card className="p-8 text-center">
                <Bike size={24} className="mx-auto text-[#374151] mb-2" />
                <p className="text-sm text-[#64748b]">No riders available</p>
              </Card>
            ) : (
              <div className="space-y-3">
                {riders.map((r) => (
                  <Card key={r.id} className="p-4">
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-[rgba(255,101,36,0.1)] flex items-center justify-center text-sm font-bold text-[#FF8B5E]">
                        {r.full_name[0]?.toUpperCase() ?? "?"}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#f1f5f9]">{r.full_name}</p>
                        <div className="flex items-center gap-3 text-xs text-[#64748b] mt-0.5">
                          {r.zone && <span>{r.zone}</span>}
                          <span className="flex items-center gap-1"><Star size={10} className="text-[#F59E0B]" /> {r.rating?.toFixed(1) ?? "—"}</span>
                          <span>{r.trips_today ?? 0} trips</span>
                        </div>
                      </div>
                      <Badge variant={r.is_available ? "green" : "amber"}>
                        {r.is_available ? "Free" : "Busy"}
                      </Badge>
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
