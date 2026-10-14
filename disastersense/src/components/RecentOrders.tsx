"use client";

import { motion } from "framer-motion";

interface Order {
  id: string;
  item: string;
  date: string;
  price: string;
  status: "Delivered" | "Canceled" | "Pending";
}

const mockOrders: Order[] = [
  { id: "#ORD-001", item: "Emergency Kit Supply", date: "Oct 12, 2026", price: "$299", status: "Delivered" },
  { id: "#ORD-002", item: "Medical Equipment", date: "Oct 11, 2026", price: "$1,250", status: "Delivered" },
  { id: "#ORD-003", item: "Water Purification System", date: "Oct 10, 2026", price: "$450", status: "Canceled" },
  { id: "#ORD-004", item: "Rescue Boat", date: "Oct 9, 2026", price: "$3,500", status: "Delivered" },
  { id: "#ORD-005", item: "Communication Devices", date: "Oct 8, 2026", price: "$890", status: "Pending" },
];

export function RecentOrders() {
  const getStatusColor = (status: Order["status"]) => {
    switch (status) {
      case "Delivered":
        return "bg-green-100 text-green-700";
      case "Canceled":
        return "bg-red-100 text-red-700";
      case "Pending":
        return "bg-yellow-100 text-yellow-700";
    }
  };

  return (
    <motion.div
      initial={{ y: 20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5, delay: 0.4 }}
      className="rounded-md border border-line bg-panel p-6 shadow-panel"
    >
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-bold text-ink">Recent Orders</h3>
        <button className="text-sm font-semibold text-accent hover:underline">
          SEE ALL
        </button>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-line text-left text-xs font-semibold text-muted">
              <th className="pb-3">Order ID</th>
              <th className="pb-3">Item</th>
              <th className="pb-3">Date</th>
              <th className="pb-3">Price</th>
              <th className="pb-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {mockOrders.map((order, index) => (
              <motion.tr
                key={order.id}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: 0.5 + index * 0.05 }}
                className="border-b border-line text-sm"
              >
                <td className="py-3 font-medium text-ink">{order.id}</td>
                <td className="py-3 text-muted">{order.item}</td>
                <td className="py-3 text-muted">{order.date}</td>
                <td className="py-3 font-semibold text-ink">{order.price}</td>
                <td className="py-3">
                  <span
                    className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${getStatusColor(order.status)}`}
                  >
                    {order.status}
                  </span>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </motion.div>
  );
}
