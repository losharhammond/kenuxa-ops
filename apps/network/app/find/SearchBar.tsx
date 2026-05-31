"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Search, MapPin } from "lucide-react";

const POPULAR_SEARCHES = [
  "Pharmacy near me", "Electrician Accra", "Wholesale rice supplier",
  "Restaurant Kumasi", "Web developer Ghana", "Car mechanic near me",
  "Lawyer Accra", "Supermarket Takoradi",
];

export function SearchBar() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (city) params.set("city", city);
    router.push(`/dashboard/directory?${params.toString()}`);
  };

  return (
    <>
      <div className="bg-[#0d0f1a] border border-white/10 rounded-2xl p-3 shadow-[0_16px_48px_rgba(0,0,0,0.4)] flex flex-col md:flex-row gap-2">
        <div className="flex-1 flex items-center gap-2 bg-[#111624] border border-white/7 rounded-xl px-4 h-12">
          <Search size={15} className="text-[#64748b] flex-shrink-0" />
          <input
            className="flex-1 bg-transparent border-none outline-none text-[#f1f5f9] text-sm placeholder:text-[#374151]"
            placeholder="Electrician, pharmacy, restaurant..."
            style={{ padding: 0 }}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleSearch()}
          />
        </div>
        <div className="flex items-center gap-2 bg-[#111624] border border-white/7 rounded-xl px-4 h-12 md:w-44">
          <MapPin size={14} className="text-[#64748b] flex-shrink-0" />
          <select
            className="flex-1 bg-transparent border-none outline-none text-sm text-[#64748b]"
            style={{ padding: 0 }}
            value={city}
            onChange={(e) => setCity(e.target.value)}
          >
            <option value="">All Ghana</option>
            <option>Accra</option>
            <option>Kumasi</option>
            <option>Takoradi</option>
            <option>Tamale</option>
            <option>Cape Coast</option>
          </select>
        </div>
        <Button size="lg" className="h-12 px-8" onClick={handleSearch}>Search</Button>
      </div>
      <div className="mt-5 flex flex-wrap justify-center gap-2">
        {POPULAR_SEARCHES.map((s) => (
          <button
            key={s}
            onClick={() => { setQuery(s); }}
            className="text-xs bg-white/5 hover:bg-[rgba(255,101,36,0.1)] text-[#64748b] hover:text-[#FF8B5E] border border-white/7 hover:border-[rgba(255,101,36,0.3)] px-3 py-1.5 rounded-full transition-colors"
          >
            {s}
          </button>
        ))}
      </div>
    </>
  );
}
