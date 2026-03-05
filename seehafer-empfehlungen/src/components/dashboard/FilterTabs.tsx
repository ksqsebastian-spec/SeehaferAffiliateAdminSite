"use client";

import type { EmpfehlungStatus } from "@/types";

type FilterOption = "alle" | EmpfehlungStatus;

interface FilterTabsProps {
  active: FilterOption;
  counts: Record<FilterOption, number>;
  onChange: (filter: FilterOption) => void;
}

const tabs: { key: FilterOption; label: string }[] = [
  { key: "alle", label: "Alle" },
  { key: "offen", label: "Offen" },
  { key: "erledigt", label: "Erledigt" },
  { key: "ausgezahlt", label: "Ausgezahlt" },
];

export function FilterTabs({ active, counts, onChange }: FilterTabsProps) {
  return (
    <div
      role="tablist"
      style={{
        display: "flex",
        gap: "8px",
        overflowX: "auto",
        paddingBottom: "4px",
      }}
    >
      {tabs.map((tab) => {
        const isActive = active === tab.key;
        return (
          <button
            key={tab.key}
            role="tab"
            aria-selected={isActive}
            onClick={() => onChange(tab.key)}
            style={{
              padding: "8px 16px",
              fontSize: "13px",
              fontWeight: isActive ? 600 : 400,
              border: "none",
              borderRadius: "var(--radius-sm)",
              backgroundColor: isActive ? "var(--navy)" : "transparent",
              color: isActive ? "white" : "var(--text-muted)",
              cursor: "pointer",
              whiteSpace: "nowrap",
              transition: "all 0.2s ease",
            }}
          >
            {tab.label}({counts[tab.key]})
          </button>
        );
      })}
    </div>
  );
}
