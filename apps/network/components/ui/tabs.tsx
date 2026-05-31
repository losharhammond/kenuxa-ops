"use client";

import { cn } from "@/lib/utils";
import { createContext, useContext, useState } from "react";

interface TabsContextValue {
  active: string;
  setActive: (tab: string) => void;
}

const TabsContext = createContext<TabsContextValue>({ active: "", setActive: () => {} });

interface TabsProps {
  defaultValue: string;
  children: React.ReactNode;
  className?: string;
  onChange?: (value: string) => void;
}

export function Tabs({ defaultValue, children, className, onChange }: TabsProps) {
  const [active, setActive] = useState(defaultValue);
  const handleChange = (tab: string) => {
    setActive(tab);
    onChange?.(tab);
  };
  return (
    <TabsContext.Provider value={{ active, setActive: handleChange }}>
      <div className={className}>{children}</div>
    </TabsContext.Provider>
  );
}

interface TabsListProps {
  children: React.ReactNode;
  className?: string;
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div className={cn(
      "flex items-center gap-1 bg-[#111624] border border-white/7 rounded-xl p-1",
      className
    )}>
      {children}
    </div>
  );
}

interface TabsTriggerProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsTrigger({ value, children, className }: TabsTriggerProps) {
  const { active, setActive } = useContext(TabsContext);
  const isActive = active === value;
  return (
    <button
      onClick={() => setActive(value)}
      className={cn(
        "flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-all",
        isActive
          ? "bg-[rgba(255,101,36,0.15)] text-[#FF8B5E] shadow-sm"
          : "text-[#64748b] hover:text-[#f1f5f9] hover:bg-white/5",
        className
      )}
    >
      {children}
    </button>
  );
}

interface TabsContentProps {
  value: string;
  children: React.ReactNode;
  className?: string;
}

export function TabsContent({ value, children, className }: TabsContentProps) {
  const { active } = useContext(TabsContext);
  if (active !== value) return null;
  return <div className={cn("animate-fade-in", className)}>{children}</div>;
}
