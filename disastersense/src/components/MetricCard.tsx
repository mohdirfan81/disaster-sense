"use client";

import { motion } from "framer-motion";

interface MetricCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  delay: number;
}

export function MetricCard({ title, value, icon, delay }: MetricCardProps) {
  return (
    <motion.div
      initial={{ y: 20, opacity: 0, scale: 0.95 }}
      animate={{ y: 0, opacity: 1, scale: 1 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ scale: 1.02, y: -5 }}
      className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-purple-600 via-purple-500 to-pink-500 p-6 text-white shadow-xl"
    >
      <div className="absolute -right-4 -top-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      <div className="absolute -bottom-4 -left-4 h-24 w-24 rounded-full bg-white/10 blur-2xl" />
      <div className="relative z-10">
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-white/20 backdrop-blur-sm">
          {icon}
        </div>
        <p className="mb-1 text-sm font-medium text-white/80">{title}</p>
        <p className="text-3xl font-bold">{value}</p>
      </div>
    </motion.div>
  );
}
