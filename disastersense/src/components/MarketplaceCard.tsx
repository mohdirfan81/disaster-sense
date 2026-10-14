"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui";

interface MarketplaceCardProps {
  title: string;
  description: string;
  value?: string;
  badge?: string;
  buttonText: string;
  delay: number;
  gradient?: boolean;
}

export function MarketplaceCard({
  title,
  description,
  value,
  badge,
  buttonText,
  delay,
  gradient = false,
}: MarketplaceCardProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -5 }}
      className={`relative overflow-hidden rounded-2xl p-6 shadow-xl ${
        gradient
          ? "bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 text-white"
          : "bg-panel border border-line"
      }`}
    >
      {gradient && (
        <>
          <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
          <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
        </>
      )}
      <div className="relative z-10">
        <div className="mb-4">
          {badge && (
            <span className="mb-2 inline-block rounded-full bg-white/20 px-3 py-1 text-xs font-semibold backdrop-blur-sm">
              {badge}
            </span>
          )}
          <h3 className="text-lg font-bold">{title}</h3>
          <p className={`text-sm ${gradient ? "text-white/80" : "text-muted"}`}>{description}</p>
        </div>
        {value && (
          <div className="mb-4">
            <p className="text-2xl font-bold">{value}</p>
          </div>
        )}
        <Button
          variant={gradient ? "secondary" : "primary"}
          className="w-full"
        >
          {buttonText}
        </Button>
      </div>
    </motion.div>
  );
}
