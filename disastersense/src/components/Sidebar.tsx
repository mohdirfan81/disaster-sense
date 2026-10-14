"use client";

import { motion } from "framer-motion";
import { LayoutDashboard, Package, TrendingUp, ShoppingBag, Folder, User, Crown } from "lucide-react";

const menuItems = [
  { id: "summary", label: "Summary", icon: LayoutDashboard },
  { id: "transactions", label: "Transactions", icon: ShoppingBag },
  { id: "statistics", label: "Statistics", icon: TrendingUp },
  { id: "products", label: "Products", icon: Package },
  { id: "categories", label: "Categories", icon: Folder },
];

export function Sidebar() {
  return (
    <motion.aside
      initial={{ x: -300, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.5, ease: "easeOut" }}
      className="hidden h-screen w-64 flex-col border-r border-line bg-panel p-6 lg:flex"
    >
      <div className="mb-8">
        <h1 className="text-2xl font-medium text-ink">
          Business
        </h1>
        <p className="text-sm text-muted">Dashboard</p>
      </div>

      <nav className="flex-1 space-y-2">
        {menuItems.map((item, index) => (
          <motion.button
            key={item.id}
            initial={{ x: -20, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            transition={{ duration: 0.3, delay: index * 0.1 }}
            className={`flex w-full items-center gap-3 rounded-md px-4 py-3 text-sm font-medium transition-colors ${
              item.id === "summary"
                ? "bg-accent-soft text-accent"
                : "text-muted hover:bg-raised hover:text-ink"
            }`}
          >
            <item.icon className="h-5 w-5" />
            {item.label}
          </motion.button>
        ))}
      </nav>

      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5, delay: 0.5 }}
        className="mt-auto rounded-md border border-line bg-raised p-4"
      >
        <div className="mb-3 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-accent text-white font-medium">
            MJ
          </div>
          <div>
            <p className="text-sm font-medium text-ink">Martina Jackson</p>
            <p className="text-xs text-muted">Admin</p>
          </div>
        </div>
        <button className="flex w-full items-center justify-center gap-2 rounded-full bg-accent px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-accent-hover">
          <Crown className="h-3.5 w-3.5" />
          Upgrade
        </button>
      </motion.div>
    </motion.aside>
  );
}
